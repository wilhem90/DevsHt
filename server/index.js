require("dotenv").config()
const app = require("./app.js")
const cors = require("cors")
const routerCentral = require("./routerCentral.js")

app.use(routerCentral)
app.use(cors())
const port = process.env.PORT

app.listen(port, () => {
    console.log(`http://localhost:${port}`);
})