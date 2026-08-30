from django.contrib import admin

from .models import Decision, Manuscript, ManuscriptAuthor, ManuscriptSupplementaryFile


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


@admin.register(ManuscriptAuthor)
class ManuscriptAuthorAdmin(admin.ModelAdmin):
    list_display = ('given_name', 'family_name', 'manuscript', 'corresponding')
    search_fields = ('given_name', 'family_name', 'email', 'manuscript__title')


@admin.register(ManuscriptSupplementaryFile)
class ManuscriptSupplementaryFileAdmin(admin.ModelAdmin):
    list_display = ('file_name', 'manuscript', 'uploaded_at')
