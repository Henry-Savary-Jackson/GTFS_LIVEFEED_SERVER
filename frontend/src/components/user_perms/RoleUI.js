export default class RoleUI {
    static short_to_long = new Map([["view", "View Trip updates and Alerts"],
    ["edit", "Edit Trip updates and Alerts"],
    ["gtfs", "Upload permanent schedules"],
    ["excel", "View the history of Alerts and Trip Updates and get excel summaries "],
    ["admin", "Add, delete or modify users and their permissions"],
    ])


    constructor(short_name, active = false) {
        this.short_name = short_name
        this.long_name = RoleUI.short_to_long.get(short_name)
        this.active = active
    }

}