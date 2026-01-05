
import { useContext } from "react";
import { alerts_context } from "../provider/AlertsProvider";

export default function useAlertPopUp(){
    return useContext(alerts_context)
}