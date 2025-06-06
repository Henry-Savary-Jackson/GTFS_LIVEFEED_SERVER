import { createContext, useReducer } from "react";
import {v4} from "uuid"
export var alertsContext = createContext([])

export function Alert({ id, deleteAlertCallback, messageInfo, timeout, type = "default" }) {

    const classNames = `border p-2 rounded text-center container ${type === "error" ? "bg-danger text-light" : type === "success" ? "bg-success text-dark" : ""}`

    return <div className={classNames} >
        {messageInfo}
        <button onClick={(e)=>{deleteAlertCallback(id, timeout)}} className=" btn btn-danger">X</button>
    </div>
}

export function AlertsProvider({ children }) {
    let [alerts, alertsReduce] = useReducer((state, action) => {
        if (action.action == "add") {
            return [...state, action.alert]
        }
        else if (action.action == "delete") {
            return state.filter((a)=>a.id !== action.id)
        }
    }, [])


    function addAlert(alert) {
        alertsReduce({ "alert": alert, "action": "add" })
    }
    function deleteAlert(id) {
        alertsReduce({ "action": "delete" , "id":id})
    }

    function popupAlert(alert) {
        let id = v4()
        alert.id = id 
        let timeout = setTimeout(() => {
            deleteAlert(id)
            // console.log("timeout deleted " + id)
        }, 8000)
        // console.log(timeout)
        alert.timeout = timeout
        addAlert(alert)
    }

    function deleteAlertBeforeTimeout(id,timeout){
        // console.log(timeout)
        clearTimeout(timeout)
        deleteAlert(id)
    }


    return <alertsContext.Provider value={[alerts, popupAlert]}  >
        <div style={{ "max-width": "32rem" }} className="container d-flex flex-column align-items-center fixed-top" >
            {alerts.map((a) => <Alert  id={a.id} deleteAlertCallback={deleteAlertBeforeTimeout} messageInfo={a.message} timeout={a.timeout} type={a.type} />)}
        </div>
        {children}
    </alertsContext.Provider>;

}