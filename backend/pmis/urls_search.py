"""
Search module URL configuration
"""

from django.urls import path
from pmis.views import search

urlpatterns = [
    path('global/', search.global_search, name='global_search'),
    path('suggestions/', search.search_suggestions, name='search_suggestions'),
]
