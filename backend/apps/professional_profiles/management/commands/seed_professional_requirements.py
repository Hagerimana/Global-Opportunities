"""Create baseline professional-profile document requirements.

Existing records are preserved so rerunning this command does not
overwrite administrator configuration.
"""

from django.core.management.base import BaseCommand
from django.db import transaction

from apps.professional_profiles.models import (
    ProfileDocumentRequirement,
    ProfileDocumentType,
    ProfileType,
)

DOCUMENT_TYPES = {
    "CV": "Curriculum vitae or professional résumé",
    "IDENTITY_DOCUMENT": "Identity document",
    "ACADEMIC_CERTIFICATE": "Academic certificate",
    "PROFESSIONAL_CERTIFICATE": "Professional certificate",
    "PROOF_OF_EXPERIENCE": "Proof of relevant experience",
    "REFERENCE_LETTER": "Professional reference or recommendation",
    "MOTIVATION_LETTER": "Mentorship statement or motivation letter",
    "EXPERTISE_STATEMENT": "Statement of expertise and intended services",
    "TRAINING_METHODOLOGY": "Training methodology statement",
    "TRAINING_PROGRAMME": "Training programme or learning materials",
    "PORTFOLIO": "Portfolio, work samples, or project references",
    "PROFESSIONAL_LICENSE": "Professional licence or registration",
    "OTHER": "Other supporting document",
}


COMMON_REQUIREMENTS = [
    {
        "code": "cv",
        "document_type": "CV",
        "name": "Curriculum vitae or professional résumé",
        "description": (
            "Provide your professional background, qualifications, "
            "and relevant experience."
        ),
    },
    {
        "code": "identity",
        "document_type": "IDENTITY_DOCUMENT",
        "name": "Identity document",
        "description": (
            "Provide identity evidence only when required by "
            "the platform's applicable verification policy."
        ),
        "condition_rule": (
            "Required when the applicable identity-verification "
            "policy requires an identity document."
        ),
        "validity_required": True,
    },
    {
        "code": "qualifications",
        "document_type": "ACADEMIC_CERTIFICATE",
        "name": "Academic or professional qualifications",
        "description": (
            "Provide academic degrees or professional certificates "
            "relevant to the requested domain."
        ),
        "condition_rule": (
            "Required when the selected professional domain "
            "requires academic or professional qualifications."
        ),
    },
    {
        "code": "experience",
        "document_type": "PROOF_OF_EXPERIENCE",
        "name": "Proof of relevant experience",
        "description": (
            "Provide evidence supporting the relevant experience "
            "claimed in your application."
        ),
    },
    {
        "code": "references",
        "document_type": "REFERENCE_LETTER",
        "name": "Professional references or recommendations",
        "description": (
            "Provide independent references supporting your "
            "experience, competence, or reliability."
        ),
        "condition_rule": (
            "Required when the applicable assessment criteria "
            "require independent professional references."
        ),
    },
    {
        "code": "professional-license",
        "document_type": "PROFESSIONAL_LICENSE",
        "name": "Professional licence or registration",
        "description": (
            "Provide evidence of authorization to practise "
            "the relevant regulated professional activity."
        ),
        "condition_rule": (
            "Required when the requested professional activity "
            "falls within a regulated profession or activity."
        ),
        "validity_required": True,
    },
]


PROFILE_REQUIREMENTS = {
    ProfileType.MENTOR: [
        {
            "code": "mentorship-statement",
            "document_type": "MOTIVATION_LETTER",
            "name": "Mentorship statement or motivation letter",
            "description": (
                "Explain your motivation, expertise, and approach "
                "to guiding and supporting project owners."
            ),
        },
    ],
    ProfileType.EXPERT: [
        {
            "code": "portfolio",
            "document_type": "PORTFOLIO",
            "name": "Portfolio, work samples, or project references",
            "description": (
                "Provide evidence of the quality and relevance "
                "of your previous professional work."
            ),
            "condition_rule": (
                "Required when a portfolio, work samples, or "
                "project references are applicable to the expertise."
            ),
        },
        {
            "code": "expertise-statement",
            "document_type": "EXPERTISE_STATEMENT",
            "name": "Statement of expertise and intended services",
            "description": (
                "Describe your areas of specialization and "
                "the professional services you can provide."
            ),
        },
    ],
    ProfileType.TRAINER: [
        {
            "code": "training-methodology",
            "document_type": "TRAINING_METHODOLOGY",
            "name": "Training methodology statement",
            "description": (
                "Explain how you plan and deliver training, "
                "facilitate learning, and assess learning outcomes."
            ),
        },
        {
            "code": "training-programme",
            "document_type": "TRAINING_PROGRAMME",
            "name": "Sample training programme or learning materials",
            "description": (
                "Provide a sample programme, curriculum, or learning "
                "materials showing structured learning activities."
            ),
        },
    ],
}


class Command(BaseCommand):
    help = (
        "Create baseline professional document types and requirements "
        "without overwriting existing configuration."
    )

    @transaction.atomic
    def handle(self, *args, **options):
        created_types = 0
        created_requirements = 0
        types = {}

        for code, name in DOCUMENT_TYPES.items():
            document_type, created = ProfileDocumentType.objects.get_or_create(
                code=code,
                defaults={
                    "name": name,
                    "is_active": True,
                },
            )

            types[code] = document_type
            created_types += int(created)

        for profile_type, extra_requirements in PROFILE_REQUIREMENTS.items():
            requirements = [
                *COMMON_REQUIREMENTS,
                *extra_requirements,
            ]

            for position, definition in enumerate(
                requirements,
                start=1,
            ):
                definition = dict(definition)

                if definition["code"] == "experience":
                    if profile_type == ProfileType.MENTOR:
                        definition["description"] = (
                            "Provide evidence of relevant work, mentoring, "
                            "leadership, or project experience."
                        )
                    elif profile_type == ProfileType.EXPERT:
                        definition["description"] = (
                            "Provide evidence of practical professional "
                            "experience in the claimed field."
                        )
                    else:
                        definition["name"] = "Proof of training or teaching experience"
                        definition["description"] = (
                            "Provide evidence of training, teaching, "
                            "facilitation, or capacity-building experience."
                        )

                condition_rule = definition.get(
                    "condition_rule",
                    "",
                )

                requirement, created = ProfileDocumentRequirement.objects.get_or_create(
                    profile_type=profile_type,
                    code=definition["code"],
                    defaults={
                        "document_type": types[definition["document_type"]],
                        "name": definition["name"],
                        "description": definition["description"],
                        "is_mandatory": True,
                        "is_conditional": bool(condition_rule),
                        "condition_rule": condition_rule,
                        "accepted_file_types": [
                            "application/pdf",
                            "image/jpeg",
                            "image/png",
                        ],
                        "max_file_size": 10 * 1024 * 1024,
                        "validity_required": definition.get(
                            "validity_required",
                            False,
                        ),
                        "allow_not_applicable": bool(condition_rule),
                        "is_active": True,
                        "display_order": position * 10,
                    },
                )

                if created:
                    requirement.full_clean()

                created_requirements += int(created)

        self.stdout.write(
            self.style.SUCCESS(
                f"Created {created_types} document types and "
                f"{created_requirements} requirements."
            )
        )

        self.stdout.write("Existing records were preserved without modification.")

        for profile_type in ProfileType.values:
            count = ProfileDocumentRequirement.objects.filter(
                profile_type=profile_type,
            ).count()

            self.stdout.write(f"{profile_type}: {count} configured requirements")
