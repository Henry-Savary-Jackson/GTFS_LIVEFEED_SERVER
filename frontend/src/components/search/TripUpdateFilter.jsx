
export function TripUpdateFilter({ setNumber, route, number, setRoute, routes }) {
    return <div className='container d-flex flex-column align-items-center gap-3'>
        <span className='fs-4 text-center'>Filter trips :</span>
        <TripIdSeacher number={number} setSearchNumber={setNumber} />
        <RouteSelect route={route} setRoute={setRoute} routes={routes} />
    </div>

}

