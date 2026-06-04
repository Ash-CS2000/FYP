from django.contrib import admin

from .models import UserProfile


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'role', 'status', 'institution')
    list_filter = ('role', 'status')
    search_fields = (
        'user__email',
        'user__username',
        'user__first_name',
        'user__last_name',
        'institution',
    )
