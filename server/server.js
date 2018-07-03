const express = require('express')
const fs = require('fs')
const app = express()

app.use(express.static('static'))

app.get('/', (req, res) => {
    let data = fs.readFileSync('index.html', {encoding: 'utf-8'})
    res.send(data)
})

const port = 8888
app.listen(port, () => {
    console.log(`Server started on http://127.0.0.1:${port}`)
})