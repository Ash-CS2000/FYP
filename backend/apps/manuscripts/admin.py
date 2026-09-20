from django.contrib import admin

from .models import (
    Decision,
    Manuscript,
    ManuscriptAffiliation,
    ManuscriptAuthor,
    ManuscriptSupplementaryFile,
)


class ManuscriptAffiliationInline(admin.TabularInline):
    model = ManuscriptAffiliation
    extra = 0


class ManuscriptAuthorInline(admin.TabularInline):
    model = ManuscriptAuthor
    extra = 0
    fields = ('order', 'given_name', 'family_name', 'email', 'corresponding', 'affiliations_display')
    readonly_fields = ('affiliations_display',)

    def affiliations_display(self, obj):
        return '; '.join(
            f"{a.institution} ({a.department}), {a.city}, {a.country}".strip(', ')
            for a in obj.affiliations.all()
        ) or '—'
    affiliations_display.short_description = 'Affiliations'


@admin.register(Decision)
class DecisionAdmin(admin.ModelAdmin):
    list_display = ('manuscript', 'type', 'decided_by', 'decided_at')
    list_filter = ('type',)
    search_fields = ('manuscript__title',)


@admin.register(Manuscript)
class ManuscriptAdmin(admin.ModelAdmin):
    list_display = ('title', 'owner', 'status', 'article_type', 'submitted_at')
    list_filter = ('status', 'article_type')
    search_fields = ('title', 'owner__email', 'owner__username')
    inlines = [ManuscriptAuthorInline]


@admin.register(ManuscriptAuthor)
class ManuscriptAuthorAdmin(admin.ModelAdmin):
    list_display = ('given_name', 'family_name', 'manuscript', 'corresponding')
    search_fields = ('given_name', 'family_name', 'email', 'manuscript__title')
    inlines = [ManuscriptAffiliationInline]


@admin.register(ManuscriptSupplementaryFile)
class ManuscriptSupplementaryFileAdmin(admin.ModelAdmin):
    list_display = ('file_name', 'manuscript', 'uploaded_at')
