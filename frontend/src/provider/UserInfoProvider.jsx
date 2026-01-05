import { createContext } from "react";
import { useCookies } from "react-cookie";

export const user_info_ctx = createContext(["",()=>{}, [], ()=>{}])


export default function UserInfoProvider({ children }) {

    let [cookies, setCookies, removeCookie] = useCookies()
    let [username, setUser] = useState(cookies.username || "")
    let [roles, setRoles] = useState(cookies.roles ? cookies.roles.split(",") : [])

    function setUserCallback(username) {
        setUser(username)
        username ? setCookies("username", username) :removeCookie("username") 
    }
    function setRolesCallback(roles) {
        setRoles(roles)
        roles && roles.length > 0 ? setCookies("roles", roles.join(",")) : removeCookie("roles") 
    }
    return <user_info_ctx.Provider value={{ username:username, "setUsername":setUserCallback, roles:roles, "setRoles":setRolesCallback }}>
        {children}
    </user_info_ctx.Provider>
}