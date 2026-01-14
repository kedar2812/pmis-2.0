from django.urls import path
from . import views

urlpatterns = [
    path('list/', views.BankListView.as_view(), name='bank-list'),
    path('ifsc/<str:ifsc_code>/', views.IFSCLookupView.as_view(), name='ifsc-lookup'),
    path('stats/', views.IFSCStatsView.as_view(), name='ifsc-stats'),
]
