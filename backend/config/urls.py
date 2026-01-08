from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse
from rest_framework_simplejwt.views import TokenRefreshView
from users.auth import CustomTokenObtainPairView
from audit import views as audit_views

def api_root(request):
    return JsonResponse({
        "status": "ok",
        "message": "PMIS Backend is running",
        "version": "1.0.0"
    })

urlpatterns = [
    path('', api_root, name='api_root'),
    path('admin/', admin.site.urls),
    path('api/auth/login/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/users/', include('users.urls')),
    path('api/banks/', include('banks.urls')),  # Bank and IFSC lookup APIs
    path('api/projects/', include('projects.urls')),
    path('api/edms/', include('edms.urls')),
    path('api/communications/', include('communications.urls')),
    path('api/finance/', include('finance.urls')),
    path('api/scheduling/', include('scheduling.urls')),
    path('api/masters/', include('masters.urls')),
    path('api/procurement/', include('procurement.urls')),  # e-Procurement module
    path('api/search/', include('search.urls')),  # Global search
    path('api/audit/logs/', audit_views.unified_audit_logs, name='unified_audit_logs'),
]

from django.conf import settings
from django.conf.urls.static import static

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
