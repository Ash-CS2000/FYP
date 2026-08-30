from django.contrib import admin

from .models import Notification


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ('recipient', 'category', 'title', 'read', 'created_at')
    list_filter = ('category', 'read')
    search_fields = ('recipient__email', 'title')
