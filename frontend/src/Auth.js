import axios from 'axios'

export async function login(username, password, remember_me) {
    try {
        await axios.postForm("/auth/login", { "username": username, "password": password, "remember_me": remember_me }, { withCredentials: true })
    } catch (error) {
        if (error.response) {
            throw new Error(error.response.data)
        }
        throw error
    }

}

export async function logout() {
    try {
        await axios.get("/auth/logout", { withCredentials: true })
    } catch (error) {
        if (error.response) {
            throw new Error(error.response.data)
        }
        throw error
    }
}