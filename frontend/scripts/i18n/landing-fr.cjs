/**
 * Landing-page catalogue additions -- French.
 *
 * Structure mirrors `scripts/i18n/landing-en.cjs` exactly: same keys, same
 * array lengths, same array order. Only the string values are translated.
 * `scripts/apply-i18n.cjs` deep-merges this `landing` tree into
 * `messages/fr/landing.json`.
 */
module.exports = {
  landing: {
    nav: {
      homeAria: "Global Opportunities, accueil",
      logoutFailed:
        "La déconnexion n'a pas pu être effectuée. Veuillez réessayer ou effacer la session de ce navigateur.",
      logoutRecoveryNote:
        "Effacer la session de ce navigateur supprime les jetons enregistrés, mais ne confirme pas que le jeton de rafraîchissement a été révoqué sur le serveur.",
      retryLogout: "Réessayer la déconnexion",
      clearSession: "Effacer la session de ce navigateur",
      dismiss: "Fermer",
    },

    hero: {
      description:
        "Global Opportunities réunit les opportunités de financement, les appels à projets, les candidatures, l'évaluation, les décaissements et le suivi des paiements dans un espace de travail sécurisé et multilingue. Un porteur de projet découvre un appel, construit un projet selon ses critères réels, dépose sa candidature et suit le financement jusqu'à la livraison, sans perdre le fil dans une dizaine de boîtes de réception.",
      stepProgress: "Étape {step} sur {total}",
      mock: {
        amount: "12 000 - 60 000 USD",
        documentsReady: "3 documents prêts",
        documentsList: "Enregistrement · Plan de travail · Budget",
        trancheReleased: "Tranche 1 décaissée",
        trancheAmount: "16 000 USD sur 48 000",
        askAi: "Demandez à l'assistant IA ce que cet appel exige",
      },
    },

    trust: {
      description:
        "Chaque chiffre ci-dessus décrit la plateforme telle qu'elle est construite aujourd'hui. Aucun de ces chiffres n'est une statistique d'adoption, car il n'existe encore aucune donnée d'usage vérifiée.",
      assurance:
        "La sécurité est décrite par ce que la plateforme fait — sessions par jeton, documents rattachés au projet, accès selon le rôle — et non par des labels qu'elle n'a pas obtenus.",
      details: [
        "Catalogues d'interface en anglais, français, kirundi et kiswahili.",
        "Découvrez avec Monitor — le parcours complet, de l'opportunité à l'impact.",
        "Modules métier couvrant les appels, les projets, les candidatures, le financement et les documents.",
        "Les rôles d'acteurs autour desquels la plateforme est conçue, du candidat à l'administrateur.",
      ],
      signalDetails: {
        auth: "Les identifiants sont échangés contre un jeton d'accès de courte durée, et aucune session n'est conservée dans la page.",
        docs: "Chaque fichier téléversé porte une catégorie et un état de révision, afin que son statut soit visible pour les deux parties.",
        notifications:
          "Les dates limites, les décisions et l'état des documents génèrent des notifications avec des préférences par utilisateur.",
        structure:
          "Les candidatures, les décisions et les paiements sont des enregistrements structurés, et non des pièces jointes dans des courriels.",
      },
    },

    discovery: {
      description:
        "Les opportunités de financement et les appels à projets figurent dans un seul index. Filtrez par type, secteur, lieu et statut, puis ouvrez une annonce pour consulter ses critères d'éligibilité et les documents qu'elle demande.",
    },

    features: {
      description:
        "La découverte est le point de départ du porteur de projet. Tout ce qui suit — construire le projet, candidater, être évalué, être financé, être payé et démontrer ce qui a changé — s'appuie sur le même dossier plutôt que sur un nouveau système à chaque fois.",
      details: [
        "Un index consultable des opportunités de financement et des appels, filtrable par type, secteur, lieu et statut.",
        "Un dossier de projet structuré avec objectifs, résultats, budget et documents, afin que le projet soit construit une fois et réutilisé.",
        "Les candidatures portent un statut et un historique, afin que le candidat sache toujours à quelle étape son dossier est parvenu.",
        "Des critères définis, des évaluations attribuées et une décision consignée, afin que la sélection soit explicable plutôt qu'opaque.",
        "Le financement accordé et chaque décaissement suivis par rapport au projet, avec la prochaine tranche visible.",
        "Des paiements enregistrés par rapport à un décaissement, offrant aux deux parties une vue unique de ce qui a été payé et de ce qui reste en attente.",
        "Des documents téléversés une seule fois, catégorisés et partagés uniquement avec les parties rattachées au projet.",
        "Des rappels de date limite, des avis de décision et l'état des documents transmis aux personnes concernées.",
        "Des réponses en langage clair sur une opportunité, son éligibilité et ses documents — fondées sur les informations officielles.",
      ],
    },

    showcase: {
      description:
        "Chaque écran ci-dessous est composé des mêmes composants que cette page. Ce qui change d'un écran à l'autre, c'est l'acteur : un candidat qui parcourt les appels, un porteur de projet qui gère la mise en œuvre, un financeur qui suit un financement accordé.",
      mock: {
        search: "résilience",
        meta: ["Clôture le 15 oct.", "Clôture le 18 déc.", "Ouverture le 01 nov."],
        deltas: [
          "+1 ce mois-ci",
          "2 en attente d'examen",
          "USD, sur 3 projets",
          "4 à traiter",
        ],
        activity: [
          "Candidature déposée",
          "Document budgétaire remplacé",
          "Question d'évaluateur traitée",
          "Rappel de date limite envoyé",
        ],
        when: ["Il y a 2 heures", "Hier", "Il y a 3 jours", "Il y a 5 jours"],
        applicationTitles: [
          "Restauration des bassins versants",
          "Clubs scolaires et groupes d'étude",
          "Connectivité rurale partagée",
        ],
        funders: [
          "Partenaire de financement d'exemple",
          "Secrétariat de programme d'exemple",
          "Fonds technologique d'exemple",
        ],
        amounts: ["16 000 USD", "16 000 USD", "16 000 USD"],
        totalAwarded: "48 000 USD",
        disbursed: "24 000 USD",
        paymentDates: ["12 août 2026", "4 sept. 2026"],
        paymentAmounts: ["16 000 USD", "8 000 USD"],
      },
    },

    how: {
      description:
        "Chaque écran, notification et autorisation de la plateforme correspond à l'une de ces neuf étapes. C'est ce qui garantit que le projet, sa candidature, son financement et son suivi décrivent la même réalité.",
      details: [
        "Recherchez dans l'index des annonces ouvertes et filtrez jusqu'à celles qui correspondent à un secteur, un lieu et une date limite.",
        "Lisez le résumé, les critères d'éligibilité, les documents requis et la date limite de chaque annonce présélectionnée.",
        "Construisez le dossier de projet : objectifs, résultats attendus, budget, équipe et documents justificatifs.",
        "Déposez le projet sur une annonce. La candidature hérite des documents du projet au lieu de les redemander.",
        "Les évaluations se déroulent selon des critères définis, chaque évaluation étant consignée par rapport à son attribution.",
        "La décision de sélection est consignée sur la candidature et les deux parties sont notifiées.",
        "Le financement accordé est rattaché au projet avec un calendrier de décaissement que le candidat peut consulter.",
        "Les paiements sont enregistrés par rapport à chaque décaissement, qui est clôturé au fur et à mesure de l'exécution.",
        "L'activité, les indicateurs et les documents restent visibles sur le projet pendant toute sa durée, et pas seulement jusqu'à la date limite.",
      ],
      outputs: [
        "Une présélection",
        "Une décision claire : poursuivre ou non",
        "Un projet complet",
        "Une candidature suivie",
        "Une évaluation notée",
        "Un résultat consigné",
        "Un calendrier convenu",
        "Une piste de paiement rapprochée",
        "Des preuves continues",
      ],
    },

    benefits: {
      description:
        "L'essentiel des frictions dans une demande de financement ne vient pas de la rédaction. Il s'agit de trouver l'appel, de comprendre ce qu'il attend, de tenir les documents en ordre et de savoir ce qui s'est passé. Voici les huit points sur lesquels la plateforme supprime du travail.",
      details: [
        "Les annonces de tous les fournisseurs dans un seul index, avec un seul jeu de filtres, plutôt qu'une dizaine de boîtes de réception et de sites.",
        "Les documents sont rattachés au projet une seule fois et suivent la candidature, si bien que rien n'est téléversé de nouveau pour chaque appel.",
        "Un projet est un dossier avec objectifs, résultats, budget et avancement, et non un répertoire de fichiers aux noms différents.",
        "Les critères, les notes et la décision sont visibles, afin que le candidat comprenne pourquoi une candidature a été retenue ou non.",
        "Le financement accordé, la prochaine tranche et les montants déjà payés sont visibles simultanément par les deux parties.",
        "Les documents sont catégorisés, révisables et rattachés à un projet, au lieu d'être dispersés dans les courriels.",
        "Un utilisateur qui travaille en kiswahili lit la même plateforme qu'un utilisateur qui travaille en français, dans sa propre langue.",
        "Un assistant qui explique un appel, liste les documents nécessaires et traduit les parties techniques.",
      ],
    },

    ecosystem: {
      description:
        "La plateforme est le dossier partagé. Chaque acteur voit la partie dont il a la responsabilité, et chaque interaction entre eux est une étape du même projet plutôt qu'un message dans un fil différent.",
      hubLabel: "Le dossier partagé sur lequel travaille chaque acteur",
      actorDetails: [
        "Mettent en œuvre les projets, détiennent les dossiers de projet et consultent leurs candidatures et leur financement au même endroit.",
        "Publient les opportunités, définissent les critères, attribuent les évaluations, accordent les financements et programment les décaissements.",
        "Coordonnent un projet au sein d'une équipe, avec un dossier unique auquel chacun contribue.",
        "Découvrent un appel, construisent un projet en conséquence, candidatent et suivent le résultat étape par étape.",
        "Évaluent les candidatures attribuées selon les critères publiés et consignent une évaluation notée.",
        "Vérifient les organisations, gèrent les rôles et supervisent l'activité et les dossiers de la plateforme.",
      ],
      flows: [
        "Publier les annonces",
        "Construire un projet",
        "Candidater",
        "Évaluer",
        "Décider",
        "Décaisser",
      ],
    },

    projects: {
      eyebrow: "Projets",
      title: "Des idées qui cherchent un soutien. Des projets qui avancent.",
      description:
        "Explorez les projets publiés, les travaux financés en cours et les initiatives récemment achevées.",
      ctaNew: "Ajouter votre projet",
      ctaAll: "Voir tous les projets en recherche de financement",
      errorFallback: "Impossible de charger les projets.",
      retry: "Réessayer de charger les projets",
      loading: "Chargement des projets…",
      fundedTitle: "Projets financés",
      groups: {
        seeking: {
          title: "En recherche de financement",
          body: "Les quatre projets publiés les plus récents sans financement accordé.",
          empty: "Aucun projet publié ne recherche actuellement de financement.",
        },
        inProgress: {
          title: "En cours",
          body: "Jusqu'à quatre projets à 90 % ou moins, classés par avancement décroissant.",
          empty: "Aucun projet financé en cours et éligible n'est encore disponible.",
        },
        completed: {
          title: "Récemment achevés",
          body: "Les quatre projets financés achevés le plus récemment.",
          empty: "Aucun projet financé achevé n'est encore disponible.",
        },
      },
      items: {
        watershed: {
          title: "Restauration des bassins versants dans trois communes",
          funding: "48 000 USD sur 24 mois",
          objective:
            "Restaurer les pentes dégradées et stabiliser les sources d'eau dans trois communes, sous la conduite de coopératives agricoles.",
          results: [
            "120 hectares en cours de restauration",
            "40 coopératives agricoles mobilisées",
            "Débit des sources rétabli sur 6 sites",
          ],
          impact: ["restaurés", "coopératives", "sources d'eau"],
        },
        schoolClubs: {
          title: "Clubs scolaires et groupes d'étude communautaires",
          funding: "31 500 USD sur 18 mois",
          objective:
            "Créer des clubs d'élèves durables et des groupes d'étude pour adultes qui continuent après la période du projet.",
          results: [
            "60 clubs scolaires créés et actifs",
            "25 groupes d'alphabétisation pour adultes se réunissant chaque semaine",
            "Évaluation de lecture réalisée au niveau des regroupements",
          ],
          impact: ["apprenants", "clubs", "districts"],
        },
        sharedConnectivity: {
          title: "Points de connectivité rurale partagés",
          funding: "65 000 USD sur 30 mois",
          objective:
            "Équiper des points d'accès communautaires en appareils, connectivité et formation, gérés par des coopératives locales.",
          results: [
            "25 points d'accès équipés et opérationnels",
            "60 formateurs communautaires certifiés",
            "Coût par utilisateur inférieur à la référence nationale",
          ],
          impact: ["points d'accès", "formateurs", "utilisateurs"],
        },
      },
    },

    ai: {
      description:
        "Posez une question dans l'une des quatre langues de l'interface. L'assistant travaille à partir des informations propres à la plateforme — une annonce, ses critères, ses documents — plutôt que d'une supposition ouverte.",
      capabilityDetails: [
        "Résumer l'objet d'un appel, les publics auxquels il s'adresse et ce qu'il financera.",
        "Transformer une section d'éligibilité dense en une liste de vérification à laquelle vous pouvez réellement répondre.",
        "Lister les documents qu'un appel demande et signaler ceux qui manquent encore à votre projet.",
        "Réduire un long document d'appel aux paragraphes qui concernent votre organisation.",
        "Fournir une explication dans la langue de travail du lecteur.",
        "Dérouler l'étape suivante d'une candidature, dans l'ordre, sans rien omettre.",
      ],
      script: {
        assistant: [
          "Je peux vous aider à examiner les critères officiels. Pour une subvention communautaire, les deux éléments qui décident généralement de l'éligibilité sont l'enregistrement légal et au moins un an d'activité documentée.",
          "La plupart des appels en demandent trois : un certificat d'enregistrement, un plan de travail signé et un budget. Ouvrez l'annonce et le panneau des documents les affiche par rapport à ce que vous avez déjà téléversé.",
        ],
      },
    },

    languages: {
      description:
        "L'interface est disponible en anglais, en français, en kirundi et en kiswahili. Un lecteur peut rechercher, filtrer, enregistrer et soumettre sans quitter la langue dans laquelle il a commencé, et un administrateur peut ajouter une cinquième langue sans modifier un seul composant.",
      note: "L'interface et le contenu des pages sont traduits dans les quatre langues. Le titre d'une annonce reste dans la langue dans laquelle il a été rédigé ; l'interface autour suit le lecteur.",
    },

    testimonials: {
      quotes: [
        "Je gardais les appels dans un tableur déjà périmé. Désormais, la date limite, les documents et l'état de ma candidature sont sur une seule page, et je cesse de travailler de mémoire.",
        "Nous publions un appel une fois et voyons chaque candidature selon les mêmes critères. Les évaluateurs ne nous envoient plus leurs notes par courriel, et nous pouvons répondre à un candidat sans chercher le fil de discussion.",
        "On me confie des candidatures précises, on ne me demande pas de les trouver. Mes notes s'appuient sur les critères publiés, si bien que la décision à laquelle je contribue peut être expliquée à quiconque la demande.",
      ],
    },

    impact: {
      description:
        "Cinq changements, dans l'ordre où ils se produisent. Chacun est un constat sur le fonctionnement de la plateforme, et non une mesure de son efficacité : c'est le seul type de constat disponible avant le lancement.",
      details: [
        "Une annonce qui serait passée inaperçue dans une boîte de réception encombrée se trouve désormais avec un filtre et une alerte de date limite.",
        "Un projet construit selon des critères réels avant la date limite, au lieu d'être rédigé à 23 h la veille.",
        "Les décisions de financement et les décaissements consignés dans un espace que les deux parties peuvent consulter, sans rapprochement par courriel.",
        "L'activité et les indicateurs examinés selon le calendrier, pendant que le projet est encore en cours et peut encore être ajusté.",
        "Les porteurs de projet et les organismes financeurs travaillant à partir du même dossier au lieu d'échanger des versions.",
      ],
    },

    pricing: {
      roleDetails: [
        "Enregistrez votre organisation, publiez des annonces et gérez les candidatures que vous recevez.",
        "Attribué par un financeur ou un administrateur. Évaluez les candidatures attribuées selon les critères publiés.",
        "Administration de la plateforme : vérification, attribution des rôles et supervision de l'activité.",
      ],
    },

    faq: {
      description:
        "Les douze questions qui déterminent l'utilité de la plateforme, avec des réponses sans langage marketing. Lorsque la réponse honnête est qu'une fonction n'est pas encore développée, c'est ce qui est indiqué.",
      a: {
        q1: "Deux types d'annonces : les opportunités de financement, qui accordent des fonds pour un projet, et les appels à projets, qui invitent à soumettre des propositions. Chaque annonce précise un secteur, un lieu, un résumé des critères d'éligibilité, les documents requis et une date de clôture. La section de découverte filtre sur les deux types, afin de réduire l'index avant même de commencer la lecture.",
        q2: "Chaque annonce affiche un statut, et le filtre permet de restreindre l'index aux appels ouverts uniquement. La date limite figure sur la carte et dans le détail de l'annonce, et les notifications peuvent être configurées par utilisateur afin qu'une date de clôture ne soit pas quelque chose que vous devez mémoriser.",
        q3: "Un dossier de projet avec ses objectifs, son budget et ses documents, ainsi que ce que l'appel particulier demande. Comme les documents sont rattachés au projet et non à la candidature, un projet préparé une fois peut être soumis à plusieurs appels sans rien téléverser de nouveau. L'assistant IA liste les documents qu'un appel exige.",
        q4: "Une candidature possède un statut et un historique plutôt qu'un simple indicateur soumis ou non, ce qui vous permet de voir à quelle étape elle est parvenue. La possibilité de modifier une candidature déposée dépend des règles propres à l'appel, indiquées dans son annonce ; la plateforme affiche l'étape, elle ne se substitue pas à la politique du financeur.",
        q5: "Assez pour être évaluable : ce que le projet fera, pour qui, sur quelle période, à quel coût, et comment vous saurez que cela a fonctionné. Un projet est créé avant qu'une candidature soit déposée sur un appel, ce qui vous permet de le préparer selon des critères réels plutôt que d'écrire dans l'urgence d'une date limite.",
        q6: "Le financement accordé est rattaché au projet, avec un calendrier de décaissement. Chaque tranche est enregistrée au moment de son décaissement, afin que le candidat voie ce qui a été approuvé, ce qui est arrivé et ce qui suit. La plateforme enregistre le calendrier et son avancement ; elle n'est pas elle-même un établissement financier.",
        q7: "Les documents qu'un projet ou un appel exige — certificats d'enregistrement, plans de travail, budgets, notes conceptuelles, politiques. Chaque fichier est catégorisé et porte un état de révision, et il est visible par les parties rattachées à ce projet plutôt que publié. Les documents sont conservés avec le dossier de projet afin de rester associés à lui pendant toute sa durée.",
        q8: "Selon des critères définis, chaque évaluateur se voyant attribuer des candidatures précises et chaque note étant consignée par rapport à son attribution. La décision de sélection est conservée sur la candidature, ce qui rend le résultat explicable à un candidat qui le demande. La plateforme ne décide rien elle-même ; elle consigne les critères, les notes et la décision.",
        q9: "Les paiements sont enregistrés par rapport à un décaissement, afin qu'une tranche puisse être rapprochée au fur et à mesure de l'exécution plutôt qu'en un seul versement à la fin. Le fournisseur de financement et le porteur de projet voient le même enregistrement, ce qui supprime le rapprochement qui se fait habituellement par courriel à la fin d'une période de reporting.",
        q10: "Il explique une annonce, résume les critères d'éligibilité sous forme de liste de vérification, liste les documents requis, simplifie un texte dense, traduit une explication et vous guide dans l'étape suivante d'une candidature. Il ne décide pas du financement, ne sélectionne pas les candidats et ne rend pas de jugement définitif sur l'éligibilité. Ces décisions appartiennent aux personnes qui pilotent l'appel.",
        q11: "Anglais, français, kirundi et kiswahili. Le sélecteur se trouve dans la barre de navigation et le choix est mémorisé sur cet appareil ; il définit aussi l'attribut de langue de la page afin que les lecteurs d'écran et la traduction du navigateur fonctionnent correctement. L'interface et le contenu des pages sont traduits dans les quatre langues ; le texte propre à une annonce reste dans la langue dans laquelle il a été rédigé.",
        q12: "La connexion échange vos identifiants contre un jeton d'accès de courte durée plutôt qu'une session stockée, et la plateforme est conçue avec des rôles d'organisation, d'évaluateur et d'administrateur. Les documents sont rattachés à un projet plutôt que publics. Deux réserves honnêtes : l'application des rôles est encore en cours d'intégration dans les classes de permissions de l'API, et la déconnexion efface actuellement le jeton sur cet appareil uniquement, car l'API n'a pas encore de point de terminaison de révocation.",
      },
    },

    finalCta: {
      details: [
        "Parcourez l'index des annonces ouvertes, filtré par secteur, lieu et date limite.",
        "Créez un compte pour construire un projet et conserver ses documents au même endroit.",
        "Enregistrez une organisation pour publier des appels et gérer les candidatures que vous recevez.",
      ],
      note: "Les annonces, projets et candidatures présentés sur cette page sont des dossiers d'exemple. Les quatre langues de l'interface sont actives, et le contenu des pages est traduit avec elles.",
    },

    opps: {
      sectors: {
        climate: "Climat et environnement",
        education: "Éducation",
        entrepreneurship: "Entrepreneuriat",
        health: "Santé",
        digital: "Inclusion numérique",
        governance: "Gouvernance",
      },
      locations: {
        burundiRegional: "Burundi, régional",
        eastAfrica: "Afrique de l'Est",
        regional: "Régional",
        burundiNational: "Burundi, national",
        subSaharanAfrica: "Afrique subsaharienne",
        centralAfrica: "Afrique centrale",
      },
      places: {
        burundi: "Burundi",
      },
      items: {
        resilienceGrants: {
          title: "Subventions pour la résilience communautaire",
          provider: "Organisme de financement d'exemple",
          amount: "12 000 - 60 000 USD",
          summary:
            "Soutient des travaux d'adaptation menés localement — eau, sols, alerte précoce et résilience des ménages — réalisés par des organisations établies dans la zone cible.",
          eligibility: [
            "Organisation enregistrée ou groupe enregistré",
            "Au moins un an d'activité",
            "Activités menées dans la zone cible",
          ],
          documents: ["Certificat d'enregistrement", "Plan de travail signé", "Budget"],
        },
        learningCommunities: {
          title: "Appel à projets : communautés apprenantes",
          provider: "Secrétariat de programme d'exemple",
          amount: "Budget de projet jusqu'à 40 000 USD",
          summary:
            "Un appel à propositions pour construire des structures communautaires d'apprentissage durables : clubs scolaires, groupes d'étude communautaires et réseaux d'alphabétisation pour adultes.",
          eligibility: [
            "Organisation d'éducation ou de jeunesse",
            "Expérience avérée d'interventions au niveau communautaire",
            "Plan couvrant au moins 12 mois",
          ],
          documents: ["Note conceptuelle", "Organigramme", "Politique de sauvegarde"],
        },
        youthEnterprise: {
          title: "Soutien aux entreprises dirigées par des jeunes",
          provider: "Partenaire de financement d'exemple",
          amount: "5 000 - 25 000 USD",
          summary:
            "Fonds de roulement et mentorat pour de jeunes fondateurs, avec une préférence pour les entreprises qui créent de l'emploi local.",
          eligibility: [
            "Fondateur âgé de 18 à 35 ans",
            "Entreprise enregistrée",
            "Entreprise en activité depuis moins de 24 mois",
          ],
          documents: ["Enregistrement de l'entreprise", "Projection de trésorerie", "CV du fondateur"],
        },
        maternalHealth: {
          title: "Programme communautaire de santé maternelle",
          provider: "Partenariat de santé d'exemple",
          amount: "Budget de programme, pluriannuel",
          summary:
            "Recherche de partenaires de mise en œuvre pour la santé maternelle communautaire, y compris les parcours de référence et la formation des sages-femmes.",
          eligibility: [
            "ONG de santé ou établissement agréé",
            "Gouvernance clinique en place",
            "Expérience dans la province cible",
          ],
          documents: ["Agrément", "Protocole clinique", "Cadre de suivi"],
        },
        digitalAccess: {
          title: "Subventions pour l'accès numérique rural",
          provider: "Fonds technologique d'exemple",
          amount: "20 000 - 90 000 USD",
          summary:
            "Appareils, connectivité et formation pour les communautés rurales, avec priorité aux modèles d'accès partagé plutôt qu'à la distribution individuelle d'appareils.",
          eligibility: [
            "Entité à but non lucratif ou du secteur public",
            "Partenariat avec un organisme communautaire local",
            "Plan de viabilité sur trois ans",
          ],
          documents: ["Note conceptuelle", "Lettres de partenariat", "Plan de viabilité"],
        },
        governanceCivics: {
          title: "Éducation civique et gouvernance locale",
          provider: "Fondation civique d'exemple",
          amount: "Subvention jusqu'à 30 000 USD",
          summary:
            "Projets d'éducation civique qui renforcent la compréhension publique du gouvernement local, des budgets publics et des droits des citoyens.",
          eligibility: [
            "Organisation de la société civile",
            "Preuve d'animation communautaire",
            "Programme non partisan",
          ],
          documents: ["Note conceptuelle", "Plan d'activités", "Profils des animateurs"],
        },
      },
    },

    api: {
      unreachable:
        "Impossible de joindre l'API. Vérifiez votre connexion et assurez-vous que les serveurs frontend et Django sont démarrés.",
      unreachableShort:
        "Impossible de joindre l'API. Assurez-vous que les serveurs frontend et Django sont démarrés.",
      requestFailed: "Le serveur n'a pas pu traiter votre demande. Veuillez réessayer.",
      accountLoadFailed: "Les détails de votre compte n'ont pas pu être chargés.",
    },

    session: {
      browserOnly: "Une session de connexion ne peut être enregistrée que dans le navigateur.",
      tokensMissing: "La réponse de connexion ne contenait pas les deux jetons.",
      saveFailed:
        "Votre navigateur n'a pas pu enregistrer la session de connexion. Autorisez le stockage du site et réessayez.",
      loginRequired: "Veuillez vous connecter pour continuer.",
      expiredInactive:
        "Votre session a pris fin après 60 minutes d'inactivité. Veuillez vous reconnecter.",
      renewUnreachable:
        "Impossible de renouveler la session car l'API est injoignable. Veuillez réessayer.",
      changed: "La session de connexion a changé. Veuillez réessayer.",
      expired: "Votre session de connexion a expiré. Veuillez vous reconnecter.",
      renewFailed: "Le serveur n'a pas pu renouveler votre session. Veuillez réessayer.",
      invalidRenewal: "Le serveur a renvoyé une réponse de renouvellement de session invalide.",
      saveRenewedFailed: "Votre navigateur n'a pas pu enregistrer la session renouvelée.",
      noRefreshToken:
        "Aucun jeton de rafraîchissement n'est disponible. Vous pouvez plutôt effacer la session de ce navigateur.",
      logoutFailed:
        "La déconnexion côté serveur n'a pas pu être effectuée. Veuillez réessayer ou effacer la session de ce navigateur.",
      logoutFailedBare: "La déconnexion côté serveur n'a pas pu être effectuée.",
    },
  },
};
