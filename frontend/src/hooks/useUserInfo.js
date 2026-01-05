import { useContext } from "react";
import { user_info_ctx } from "../provider/UserInfoProvider";

export default function useUserInfo(){
    return useContext(user_info_ctx)
}