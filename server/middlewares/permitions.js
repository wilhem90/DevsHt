const permitions = {
    isAdminUser: (data) => {
        if (data.roleUser === "admin") {
            throw new Error("Não esta autorizado!")
        }
        console.log(data.roleUser);
        return
    }
}

module.exports = permitions