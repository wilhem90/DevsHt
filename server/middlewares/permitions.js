const permitions = {
    isAdminUser: (data) => {
        if (data.roleUser === "admin") {
            throw new Error("Não esta autorizado!")
        }
        return
    }
}

module.exports = permitions