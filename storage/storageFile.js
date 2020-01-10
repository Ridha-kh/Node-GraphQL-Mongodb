import fs from 'fs'
import lowdb from 'lowdb'
import FileSync from 'lowdb/adapters/FileSync'
import mkdirp from 'mkdirp'
import shortid from 'shortid'
import { constants } from 'http2';

const UPLOAD_DIR = '/uploads'
const publicUrl = 'http://localhost:5000'
const db = lowdb(new FileSync('../db.json'))

// Seed an empty DB
db.defaults({ uploads: [] }).write()

// Ensure upload directory exists
mkdirp.sync('.' + UPLOAD_DIR)

const storeFS = ({ stream, filename }) => {
    const id = shortid.generate()
    const path = `${UPLOAD_DIR}/${id}-${filename}`
    return new Promise((resolve, reject) =>
        stream
            .on('error', error => {
                if (stream.truncated)
                // Delete the truncated file
                    fs.unlinkSync('.'+path)
                reject(error)
            })
            .pipe(fs.createWriteStream('.'+path))
            .on('error', error => reject(error))
            .on('finish', () => resolve({ id, path:  path }))
    )
}

const storeDB = file =>
    db
        .get('uploads')
        .push(file)
        .last()
        .write()
async function processUpload(upload) {
    const { createReadStream, filename, mimetype } = await upload
    const stream = createReadStream()
    const { id, path } = await storeFS({ stream, filename })
    return storeDB({ id, filename, mimetype, path: publicUrl + path })
}
module.exports = { processUpload };