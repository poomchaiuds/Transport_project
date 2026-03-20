# backend/users/urls.py
from django.urls import path
from .views import RegisterView, UserDetailView, UserListView

urlpatterns = [
    # path นี้จะต่อท้ายจาก 'api/' ในไฟล์หลัก
    path('register/', RegisterView.as_view(), name='api-register'),
    path('user-info/<str:fb_uid>/', UserDetailView.as_view(), name='user-info'),
    path('users/', UserListView.as_view(), name='user-list'),
    
]