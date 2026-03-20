# backend/users/views.py
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .serializers import UserProfileSerializer # ต้องมีไฟล์ serializers.py ด้วยนะ
from .models import UserProfile
from rest_framework import generics  # <--- เพิ่มบรรทัดนี้

class RegisterView(APIView):
    def post(self, request):
        serializer = UserProfileSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response({"message": "User saved to DB successfully!"}, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

# เพิ่ม UserDetailView ต่อจาก RegisterView เดิมของคุณ
class UserDetailView(APIView):
    def get(self, request, fb_uid):
        try:
            # ค้นหา User จาก fb_uid ที่ส่งมาจาก React
            user = UserProfile.objects.get(fb_uid=fb_uid)
            serializer = UserProfileSerializer(user)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except UserProfile.DoesNotExist:
            return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)

class UserListView(generics.ListAPIView):
    queryset = UserProfile.objects.all()
    serializer_class = UserProfileSerializer