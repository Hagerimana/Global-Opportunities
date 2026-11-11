"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { getCurrentAccount, type CurrentAccount } from "@/lib/api";

import {
  communicationRequest,
  type Conversation,
  type ExpertInvitation,
  type Notice,
  type Page,
  type PrivateMessage,
} from "@/lib/communications";

import { readAccessToken } from "@/lib/session";
import { getActiveLocale, translate, useI18n } from "@/lib/i18n";

type Tab = "notifications" | "invitations" | "conversations";
type Folder = "inbox" | "archived" | "hidden" | "all";

const panel = "mt-6 rounded-3xl bg-white p-6 shadow-xl shadow-emerald-950/5";

const button =
  "rounded-xl border border-emerald-800 px-4 py-2 text-sm " +
  "font-semibold text-emerald-800 hover:bg-emerald-50 " +
  "disabled:cursor-not-allowed disabled:opacity-50";

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleString(getActiveLocale());
}

function messageFrom(error: unknown) {
  return error instanceof Error
    ? error.message
    : translate("inbox.errors.operation");
}

export default function InboxPage() {
  const { t } = useI18n();
  const [account, setAccount] = useState<CurrentAccount | null>(null);
  const [accountLoaded, setAccountLoaded] = useState(false);

  const [tab, setTab] = useState<Tab>("notifications");
  const [folder, setFolder] = useState<Folder>("inbox");
  const [pagePath, setPagePath] = useState<string | null>(null);
  const [previous, setPrevious] = useState<string | null>(null);
  const [next, setNext] = useState<string | null>(null);

  const [notices, setNotices] = useState<Notice[]>([]);
  const [invitations, setInvitations] = useState<ExpertInvitation[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);

  const [selected, setSelected] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Page<PrivateMessage> | null>(null);
  const [content, setContent] = useState("");

  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const pendingSend = useRef<{
    conversationId: number;
    content: string;
    key: string;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadAccount() {
      try {
        const result = await getCurrentAccount(readAccessToken() ?? "");

        if (!cancelled) setAccount(result);
      } catch (cause) {
        if (!cancelled) setError(messageFrom(cause));
      } finally {
        if (!cancelled) setAccountLoaded(true);
      }
    }

    void loadAccount();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!account) return;

    let cancelled = false;

    async function loadList() {
      setLoading(true);
      setError("");

      const path =
        pagePath ??
        (tab === "notifications"
          ? "/api/notifications/"
          : tab === "invitations"
            ? "/api/project-expert-invitations/"
            : `/api/messaging/conversations/?folder=${folder}`);

      try {
        if (tab === "notifications") {
          const result = await communicationRequest<Page<Notice>>(path);

          if (!cancelled) {
            setNotices(result.results);
            setPrevious(result.previous);
            setNext(result.next);
          }
        } else if (tab === "invitations") {
          const result =
            await communicationRequest<Page<ExpertInvitation>>(path);

          if (!cancelled) {
            setInvitations(result.results);
            setPrevious(result.previous);
            setNext(result.next);
          }
        } else {
          const result = await communicationRequest<Page<Conversation>>(path);

          if (!cancelled) {
            setConversations(result.results);
            setPrevious(result.previous);
            setNext(result.next);
          }
        }
      } catch (cause) {
        if (!cancelled) setError(messageFrom(cause));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadList();

    return () => {
      cancelled = true;
    };
  }, [account, tab, folder, pagePath, revision]);

  function changeTab(value: Tab) {
    if (busy) return;

    if (content.trim() && value !== tab) {
      if (!window.confirm(t("inbox.errors.leaveUnsent"))) return;
    }

    setTab(value);
    setPagePath(null);
    setSelected(null);
    setMessages(null);
    setContent("");
    pendingSend.current = null;
    setError("");
    setNotice("");
  }

  async function runAction(action: () => Promise<void>) {
    if (busy) return;

    setBusy(true);
    setError("");
    setNotice("");

    try {
      await action();
      setRevision((value) => value + 1);
    } catch (cause) {
      setError(messageFrom(cause));
    } finally {
      setBusy(false);
    }
  }

  async function loadConversation(
    conversationId: number,
    messagePath?: string,
  ) {
    const [conversation, timeline] = await Promise.all([
      communicationRequest<Conversation>(
        `/api/messaging/conversations/${conversationId}/`,
      ),
      communicationRequest<Page<PrivateMessage>>(
        messagePath ??
          `/api/messaging/conversations/${conversationId}/messages/`,
      ),
    ]);

    setSelected(conversation);
    setMessages(timeline);
  }

  function openConversation(conversationId: number) {
    if (
      content.trim() &&
      selected?.id !== conversationId &&
      !window.confirm(t("inbox.errors.leaveUnsent"))
    ) {
      return;
    }

    void runAction(async () => {
      await loadConversation(conversationId);

      setTab("conversations");
      setPagePath(null);
      setContent("");
      pendingSend.current = null;
    });
  }

  function openInvitationConversation(invitationId: number) {
    void runAction(async () => {
      const conversation = await communicationRequest<Conversation>(
        "/api/messaging/conversations/open/",
        "POST",
        { invitation_id: invitationId },
      );

      await loadConversation(conversation.id);

      setTab("conversations");
      setPagePath(null);
      setContent("");
      pendingSend.current = null;
    });
  }

  function openNotification(item: Notice) {
    if (
      item.target_type === "CONVERSATION" &&
      content.trim() &&
      !window.confirm(t("inbox.errors.leaveUnsent"))
    ) {
      return;
    }

    void runAction(async () => {
      await communicationRequest<Notice>(
        `/api/notifications/${item.id}/read/`,
        "PATCH",
        {},
      );

      if (
        item.target_type === "CONVERSATION" &&
        item.target_id &&
        account?.account_type === "PERSONAL"
      ) {
        await loadConversation(item.target_id);
        setTab("conversations");
        setPagePath(null);
        setContent("");
        pendingSend.current = null;
      } else if (
        item.target_type === "EXPERT_INVITATION" &&
        account?.account_type === "PERSONAL"
      ) {
        setTab("invitations");
        setPagePath(null);
        setSelected(null);
        setNotice(t("inbox.notices.notificationReadInvitations"));
      } else {
        setNotice(t("inbox.notices.notificationRead"));
      }
    });
  }

  function respond(invitationId: number, accept: boolean) {
    void runAction(async () => {
      await communicationRequest<ExpertInvitation>(
        `/api/project-expert-invitations/${invitationId}/respond/`,
        "POST",
        { accept },
      );

      setNotice(
        accept
          ? t("inbox.notices.invitationAccepted")
          : t("inbox.notices.invitationDeclined"),
      );
    });
  }

  function cancelInvitation(invitationId: number) {
    if (!window.confirm(t("inbox.errors.cancelConfirm"))) {
      return;
    }

    void runAction(async () => {
      await communicationRequest<ExpertInvitation>(
        `/api/project-expert-invitations/${invitationId}/cancel/`,
        "POST",
        {},
      );

      setNotice(t("inbox.notices.invitationCancelled"));
    });
  }

  function send() {
    if (!selected || !content.trim()) return;

    const conversationId = selected.id;
    const text = content.trim();

    if (
      pendingSend.current?.conversationId !== conversationId ||
      pendingSend.current?.content !== text
    ) {
      pendingSend.current = {
        conversationId,
        content: text,
        key: crypto.randomUUID(),
      };
    }

    const key = pendingSend.current.key;

    void runAction(async () => {
      await communicationRequest<PrivateMessage>(
        `/api/messaging/conversations/${conversationId}/messages/`,
        "POST",
        {
          client_message_id: key,
          content: text,
          subject: "",
        },
      );

      // Do not turn a successful send into an apparent send failure
      // merely because the subsequent timeline refresh fails.
      pendingSend.current = null;
      setContent("");
      setNotice(t("inbox.notices.messageSaved"));

      try {
        await loadConversation(conversationId);
      } catch {
        setNotice(t("inbox.notices.messageSavedNoRefresh"));
      }
    });
  }

  function markDisplayedRead() {
    if (!selected || !messages?.results.length) return;

    const boundary = Math.max(...messages.results.map((item) => item.id));

    void runAction(async () => {
      await communicationRequest<{ marked_read: number }>(
        `/api/messaging/conversations/${selected.id}/read/`,
        "POST",
        { through_message_id: boundary },
      );

      await loadConversation(selected.id);
      setNotice(t("inbox.notices.markedRead"));
    });
  }

  function setInboxState(changes: { archived?: boolean; hidden?: boolean }) {
    if (!selected) return;

    if (content.trim() && !window.confirm(t("inbox.errors.leaveUnsent"))) {
      return;
    }

    void runAction(async () => {
      await communicationRequest<Conversation>(
        `/api/messaging/conversations/${selected.id}/inbox-state/`,
        "PATCH",
        changes,
      );

      setSelected(null);
      setMessages(null);
      setContent("");
      pendingSend.current = null;
      setNotice(t("inbox.notices.inboxUpdated"));
    });
  }

  const personal = account?.account_type === "PERSONAL";

  const visibleTabs: Tab[] = personal
    ? ["notifications", "invitations", "conversations"]
    : ["notifications"];

  const timeline = messages ? [...messages.results].reverse() : [];

  return (
    <main className="min-h-screen bg-emerald-50 px-5 py-10">
      <div className="mx-auto max-w-4xl">
        <Link
          href="/account"
          className="text-sm font-semibold text-emerald-800"
        >
          {t("inbox.backAccount")}
        </Link>

        <h1 className="display mt-7 text-3xl text-emerald-950 sm:text-4xl">
          {t("inbox.title")}
        </h1>

        <p className="mt-3 text-slate-600">{t("inbox.intro")}</p>

        {error && (
          <p
            role="alert"
            className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-800"
          >
            {error}
          </p>
        )}

        {notice && (
          <p
            role="status"
            className="mt-5 rounded-xl bg-emerald-100 p-4 text-sm text-emerald-900"
          >
            {notice}
          </p>
        )}

        {!accountLoaded ? (
          <p role="status" className="mt-6">
            {t("inbox.loadingAccount")}
          </p>
        ) : !account ? (
          <Link href="/auth/login" className={`${button} mt-6 inline-flex`}>
            {t("inbox.logIn")}
          </Link>
        ) : (
          <>
            <nav
              aria-label={t("inbox.navLabel")}
              className="mt-6 flex flex-wrap gap-2"
            >
              {visibleTabs.map((item) => (
                <button
                  key={item}
                  type="button"
                  disabled={busy}
                  onClick={() => changeTab(item)}
                  aria-current={tab === item ? "page" : undefined}
                  className={`${button} capitalize ${
                    tab === item ? "bg-emerald-100" : "bg-white"
                  }`}
                >
                  {t(`inbox.tabs.${item}`)}
                </button>
              ))}

              <button
                type="button"
                disabled={busy || loading}
                onClick={() => setRevision((value) => value + 1)}
                className={button}
              >
                {t("inbox.refreshLists")}
              </button>
            </nav>

            {tab === "conversations" && (
              <label className="mt-5 block text-sm text-slate-700">
                {t("inbox.folderLabel")}
                <select
                  value={folder}
                  disabled={busy}
                  onChange={(event) => {
                    setFolder(event.target.value as Folder);
                    setPagePath(null);
                  }}
                  className="ml-3 rounded-xl border border-slate-200 bg-white px-3 py-2"
                >
                  <option value="inbox">{t("inbox.folders.inbox")}</option>
                  <option value="archived">{t("inbox.folders.archived")}</option>
                  <option value="hidden">{t("inbox.folders.hidden")}</option>
                  <option value="all">{t("inbox.folders.all")}</option>
                </select>
              </label>
            )}

            <section className={panel} aria-busy={loading}>
              {loading ? (
                <p role="status">{t("app.loading")}</p>
              ) : tab === "notifications" ? (
                notices.length ? (
                  <ul className="space-y-4">
                    {notices.map((item) => (
                      <li
                        key={item.id}
                        className="rounded-2xl border border-slate-200 p-4"
                      >
                        <p className="text-xs font-semibold text-emerald-700">
                          {t(`status.notification.${item.type}`)} ·{" "}
                          {item.is_read ? t("inbox.read") : t("inbox.unread")}
                        </p>
                        <h2 className="mt-2 font-semibold text-emerald-950">
                          {item.title}
                        </h2>
                        <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">
                          {item.message}
                        </p>
                        <p className="mt-2 text-xs text-slate-500">
                          {formatDate(item.created_at)}
                        </p>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => openNotification(item)}
                          className={`${button} mt-4`}
                        >
                          {t("inbox.openMarkRead")}
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>{t("inbox.emptyNotifications")}</p>
                )
              ) : tab === "invitations" ? (
                invitations.length ? (
                  <ul className="space-y-4">
                    {invitations.map((item) => {
                      const incoming = item.expert_user_id === account.id;

                      const livePending =
                        item.status === "SENT" &&
                        !item.access_revoked_at &&
                        new Date(item.expires_at).getTime() > Date.now();

                      const cancellable =
                        !incoming &&
                        !item.access_revoked_at &&
                        ["SENT", "ACCEPTED"].includes(item.status);

                      return (
                        <li
                          key={item.id}
                          className="rounded-2xl border border-slate-200 p-4"
                        >
                          <p className="text-xs font-semibold text-emerald-700">
                            {incoming ? t("inbox.received") : t("inbox.sent")}{" "}
                            · {t(`status.invitation.${item.status}`)}
                          </p>

                          <h2 className="mt-2 font-semibold text-emerald-950">
                            {item.project_title || item.project_reference}
                          </h2>

                          <p className="mt-2 text-sm text-slate-600">
                            {incoming
                              ? t("inbox.from", { name: item.applicant_name })
                              : t("inbox.expert", { name: item.expert_name })}
                          </p>

                          <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">
                            {item.message || t("inbox.noInvitationMessage")}
                          </p>

                          <p className="mt-2 text-xs text-slate-500">
                            {t("inbox.deadline", {
                              date: formatDate(item.expires_at),
                            })}
                          </p>

                          <div className="mt-4 flex flex-wrap gap-2">
                            {incoming && livePending && (
                              <>
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() => respond(item.id, true)}
                                  className={button}
                                >
                                  {t("inbox.accept")}
                                </button>
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() => respond(item.id, false)}
                                  className={button}
                                >
                                  {t("inbox.decline")}
                                </button>
                              </>
                            )}

                            <button
                              type="button"
                              disabled={busy}
                              onClick={() =>
                                openInvitationConversation(item.id)
                              }
                              className={button}
                            >
                              {t("inbox.openDiscussion")}
                            </button>

                            {cancellable && (
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => cancelInvitation(item.id)}
                                className={button}
                              >
                                {t("inbox.cancelInvitation")}
                              </button>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p>{t("inbox.emptyInvitations")}</p>
                )
              ) : conversations.length ? (
                <ul className="space-y-3">
                  {conversations.map((item) => (
                    <li key={item.id}>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => openConversation(item.id)}
                        className="w-full rounded-2xl border border-slate-200 p-4 text-left hover:bg-emerald-50 disabled:opacity-50"
                      >
                        <span className="block font-semibold text-emerald-950">
                          {item.other_participant.name || t("inbox.participant")}
                        </span>
                        <span className="mt-1 block text-sm text-slate-600">
                          {item.project_title || item.project_reference}
                        </span>
                        <span className="mt-2 block text-xs text-emerald-700">
                          {t("inbox.unreadCount", { count: item.unread_count })}{" "}
                          ·{" "}
                          {item.is_closed
                            ? t("inbox.closed")
                            : t(`status.invitation.${item.invitation_status}`)}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>{t("inbox.emptyConversations")}</p>
              )}

              <div className="mt-5 flex gap-3">
                <button
                  type="button"
                  disabled={busy || loading || !previous}
                  onClick={() => setPagePath(previous)}
                  className={button}
                >
                  {t("inbox.previous")}
                </button>
                <button
                  type="button"
                  disabled={busy || loading || !next}
                  onClick={() => setPagePath(next)}
                  className={button}
                >
                  {t("inbox.next")}
                </button>
              </div>
            </section>

            {tab === "conversations" && selected && (
              <section className={panel}>
                <h2 className="text-2xl font-semibold text-emerald-950">
                  {t("inbox.discussionTitle", {
                    name:
                      selected.other_participant.name || t("inbox.participant"),
                  })}
                </h2>

                <p className="mt-2 text-sm text-slate-600">
                  {selected.project_title || selected.project_reference}
                </p>

                <p className="mt-3 rounded-xl bg-amber-50 p-3 text-xs text-amber-900">
                  {t("inbox.confidentiality")}
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      void runAction(() => loadConversation(selected.id))
                    }
                    className={button}
                  >
                    {t("inbox.refreshConversation")}
                  </button>

                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      setInboxState({
                        archived: !selected.inbox_state.archived_at,
                      })
                    }
                    className={button}
                  >
                    {selected.inbox_state.archived_at
                      ? t("inbox.unarchive")
                      : t("inbox.archive")}
                  </button>

                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      setInboxState({
                        hidden: !selected.inbox_state.hidden_at,
                      })
                    }
                    className={button}
                  >
                    {selected.inbox_state.hidden_at
                      ? t("inbox.restoreInbox")
                      : t("inbox.hideInbox")}
                  </button>
                </div>

                <ol className="mt-6 space-y-4">
                  {timeline.map((item) => (
                    <li
                      key={item.id}
                      className={`rounded-2xl p-4 ${
                        item.is_mine ? "ml-6 bg-emerald-50" : "mr-6 bg-slate-50"
                      }`}
                    >
                      <p className="text-xs font-semibold text-emerald-800">
                        {item.is_mine
                          ? t("inbox.you")
                          : selected.other_participant.name ||
                            t("inbox.participant")}
                      </p>

                      <p className="mt-2 whitespace-pre-wrap break-words text-sm text-slate-800">
                        {item.content}
                      </p>

                      <p className="mt-2 text-xs text-slate-500">
                        {formatDate(item.sent_at)} ·{" "}
                        {t(`status.message.${item.status}`)}
                      </p>
                    </li>
                  ))}
                </ol>

                {messages?.results.length === 0 && (
                  <p className="mt-5 text-sm text-slate-600">
                    {t("inbox.noMessages")}
                  </p>
                )}

                <div className="mt-5 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={busy || !messages?.next}
                    onClick={() =>
                      void runAction(() =>
                        loadConversation(selected.id, messages!.next!),
                      )
                    }
                    className={button}
                  >
                    {t("inbox.olderMessages")}
                  </button>

                  <button
                    type="button"
                    disabled={busy || !messages?.previous}
                    onClick={() =>
                      void runAction(() =>
                        loadConversation(selected.id, messages!.previous!),
                      )
                    }
                    className={button}
                  >
                    {t("inbox.newerMessages")}
                  </button>

                  <button
                    type="button"
                    disabled={busy || !messages?.results.length}
                    onClick={markDisplayedRead}
                    className={button}
                  >
                    {t("inbox.markRead")}
                  </button>
                </div>

                <form
                  className="mt-6 border-t border-slate-200 pt-5"
                  onSubmit={(event) => {
                    event.preventDefault();
                    send();
                  }}
                >
                  <label
                    htmlFor="private-message"
                    className="block text-sm font-semibold text-slate-700"
                  >
                    {t("inbox.messageLabel")}
                  </label>

                  <textarea
                    id="private-message"
                    rows={4}
                    maxLength={10000}
                    value={content}
                    disabled={busy || selected.is_closed}
                    onChange={(event) => setContent(event.target.value)}
                    className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:ring-2 focus:ring-emerald-600 disabled:bg-slate-50"
                  />

                  <button
                    type="submit"
                    disabled={busy || selected.is_closed || !content.trim()}
                    className={`${button} mt-3`}
                  >
                    {busy
                      ? t("app.pleaseWait")
                      : t("inbox.sendMessage")}
                  </button>

                  <p className="mt-3 text-xs text-slate-500">
                    {t("inbox.messageNote")}
                  </p>
                </form>
              </section>
            )}
          </>
        )}
      </div>
    </main>
  );
}
