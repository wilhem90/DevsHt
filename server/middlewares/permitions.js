const permitions = {
    isAdminUser: (data) => {
        if (!["admin", "manager"].includes(data.roleUser)) {
            throw new Error("Não esta autorizado!")
        }
        return
    }
}

module.exports = permitions