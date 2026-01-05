
export function RouteSelect({ route, setRoute, routes }) {

    return <div className='container d-flex flex-column gap-3'>
        <label htmlFor='route_list' >Routes:</label>
        <select className='form-control' id='route_list' value={route} onChange={(event) => {
            setRoute(event.target.value)
        }}>
            <option key="All" value="" >All</option>
            {routes.map((route, i) => <option style={route.route_color? {"background": `#${route.route_color}`}: {}} key={i} value={route.route_id}>{route.route_long_name}</option>)}
        </select>
    </div>
}