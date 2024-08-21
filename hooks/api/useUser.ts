import { useQuery } from "@tanstack/react-query";
import { User } from "@/types";
import { getCurrentUser } from "@/api";

type UserResponse = {
  user: User
}

const useUser = () => 
  useQuery<UserResponse>({
    queryKey: ['user'],
    queryFn: getCurrentUser,
  });

export default useUser;