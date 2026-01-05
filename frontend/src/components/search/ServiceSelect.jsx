
export function ServiceSelect({ setService, service, services }) {

    return <div className='container d-flex flex-column gap-3 '>
        <label htmlFor='service_list'>Service:</label>
        <select className='form-control' id='service_list' value={service} onChange={(event) => {
            setService(event.target.value)
        }}>
            <option key="All" value="" >All</option>
            {services.map((val, i) => <option key={i} value={val}>{val}</option>)}
        </select>
    </div>
}