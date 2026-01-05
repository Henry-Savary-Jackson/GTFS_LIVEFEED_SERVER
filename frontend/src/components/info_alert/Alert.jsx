

export default function Alert({ id, deleteAlertCallback, messageInfo, timeout, type = "default" }) {

    const classNames = `border p-2 rounded text-center container ${type === "error" ? "bg-danger text-light" : type === "success" ? "bg-success text-dark" : ""}`

    return <div className={classNames} >
        {messageInfo}
        <button onClick={(e)=>{deleteAlertCallback(id, timeout)}} className=" btn btn-danger">X</button>
    </div>
}
