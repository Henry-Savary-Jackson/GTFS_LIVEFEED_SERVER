import axios from 'axios'

export async function login(username, password, remember_me){
    return await axios.post("/auth/login", {"username":username, "password":password, "remember_me":remember_me},{withCredentials:true})
}