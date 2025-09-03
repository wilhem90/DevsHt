const express = require("express")
const app  = express()
const routerCentral = require("./routerCentral.routes.js")
const cors = require("cors")
const morgan = require("morgan")
const { urlencoded } = require("express")

app.use(morgan("dev"))
app.use(cors())
app.use(express.json(urlencoded({ extended: true })))
app.use("/api", routerCentral)

const port = process.env.PORT || 8080
app.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}/api`);
});