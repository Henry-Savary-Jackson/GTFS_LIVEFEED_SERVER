import { createContext, useReducer, useState } from "react";

export var alertsContext = createContext([])

export function Alert({ messageInfo, type = "default" }) {

    const classNames = `border p-2 rounded text-center container ${type === "error" ? "bg-danger text-light" : type === "success" ? "bg-success text-dark" : ""}`

    return <div style={{"--bs-bg-opacity": 0.75}} className={classNames} >
        {messageInfo}
    </div>
}

export function AlertsProvider({ children }) {
    let [alerts, alertsReduce] = useReducer( (state, action)=>{
        if (action.action == "add"){
            return [...state, action.alert]
        }
        else if (action.action == "delete"){
            state.splice(0,1)
            return [...state]
        }

    },[])


    function addAlert(alert){
        alertsReduce({"alert":alert, "action":"add"})
    }
    function deleteAlert(){
        alertsReduce({ "action":"delete"})
    }

    function popupAlert(alert){
        addAlert(alert)
        setTimeout(()=>{
            deleteAlert()
        }, 8000)
    }


    return <alertsContext.Provider value={[alerts, popupAlert]}  >
        <div style={{"max-width":"32rem"}} className="container d-flex flex-column align-items-center fixed-top" >
            {alerts.map((value) => <Alert messageInfo={value.message} type={value.type} />)}
        </div>
        {children}
    </alertsContext.Provider>;

}