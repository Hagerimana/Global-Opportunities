type AccountAvatarProps = {
  accountType: "PERSONAL" | "ORGANIZATION";
  className?: string;
};

export function AccountAvatar({
  accountType,
  className = "h-8 w-8",
}: AccountAvatarProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {accountType === "ORGANIZATION" ? (
        <>
          <path d="M4 21V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v16" />
          <path d="M2 21h20" />
          <path d="M9 21v-4h6v4" />
          <path d="M8 7h1M15 7h1M8 11h1M15 11h1" />
        </>
      ) : (
        <>
          <circle cx="12" cy="8" r="3.5" />
          <path d="M5 21v-2a7 7 0 0 1 14 0v2" />
        </>
      )}
    </svg>
  );
}
