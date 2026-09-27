from rest_framework import permissions


class IsDoctorOrAdmin(permissions.BasePermission):
    """Allows access only to Doctors and Admins."""
    message = "Only Doctors or System Administrators may modify clinical thresholds."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_superuser:
            return True
        profile = getattr(request.user, 'profile', None)
        return profile and profile.role in ('DOCTOR', 'ADMIN')


class IsClinicalStaff(permissions.BasePermission):
    """Allows access to Doctors, Nurses/Caregivers, and Admins."""
    message = "Authentication as clinical staff (Doctor, Nurse, or Admin) is required."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_superuser:
            return True
        profile = getattr(request.user, 'profile', None)
        return profile and profile.role in ('DOCTOR', 'NURSE', 'ADMIN')


class IsAdminUserRole(permissions.BasePermission):
    """Allows access only to System Administrators."""
    message = "Only System Administrators may perform this management action."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_superuser:
            return True
        profile = getattr(request.user, 'profile', None)
        return profile and profile.role == 'ADMIN'
