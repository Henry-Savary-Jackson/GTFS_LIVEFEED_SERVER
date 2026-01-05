import {  useReducer } from "react";
import {v4} from "uuid"
import Alert from "../components/info_alert/Alert";

export var alerts_context = createContext([])


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


    return <alerts_context.Provider value={popupAlert}  >
        <div style={{ "max-width": "32rem" }} className="container d-flex flex-column align-items-center fixed-top" >
            {alerts.map((a) => <Alert  id={a.id} deleteAlertCallback={deleteAlertBeforeTimeout} messageInfo={a.message} timeout={a.timeout} type={a.type} />)}
        </div>
        {children}
    </alerts_context.Provider>;

}