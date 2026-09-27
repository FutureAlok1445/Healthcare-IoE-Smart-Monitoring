from django.contrib import admin
from .models import Alert


@admin.register(Alert)
class AlertAdmin(admin.ModelAdmin):
    list_display = ('patient', 'level', 'acknowledged', 'created_at')
    list_filter = ('level', 'acknowledged')
