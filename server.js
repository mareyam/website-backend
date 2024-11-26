const express = require('express');
const mysql = require('mysql');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '.env') });
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Add this line to serve images statically
app.use(
  '/gallery_images',
  express.static(path.join(__dirname, 'gallery_images'))
);

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'jamialbj_AliZaman',
  password: process.env.DB_PASSWORD || 'AliZaman15',
  database: process.env.DB_NAME || 'jamialbj_jamiadb',
};
console.log(dbConfig);
let db;

function handleDisconnect() {
  db = mysql.createConnection(dbConfig);

  db.connect((err) => {
    if (err) {
      console.error('Error connecting to database:', err);
      setTimeout(handleDisconnect, 2000);
    } else {
      console.log('Connected to database');
    }
  });

  db.on('error', (err) => {
    console.error('Database error', err);
    if (err.code === 'PROTOCOL_CONNECTION_LOST') {
      console.log('Lost connection to database. Reconnecting...');
      handleDisconnect();
    } else {
      throw err;
    }
  });
}

handleDisconnect();

app.get('/ping', (req, res) => {
  res.send('Server is working');
  console.log('here');
});

app.get('/', (req, res) => {
  res.json('From Backend Side');
});

app.get('/user_books', (req, res) => {
  const { year, slug_url } = req.query;
  let sql = 'SELECT * FROM user_books WHERE 1=1';
  const params = [];

  if (year) {
    sql += ' AND book_year = ?';
    params.push(year);
  }
  if (slug_url) {
    sql += ' AND slug_url = ?';
    params.push(slug_url);
  }
  sql += ' ORDER BY MONTH(date_created) DESC';

  db.query(sql, params, (err, data) => {
    if (err) {
      console.error('Error in /user_books:', err);
      return res
        .status(500)
        .json({ error: 'Database error', details: err.message });
    }
    res.json(data);
  });
});

app.get('/years', (req, res) => {
  const sql =
    'SELECT DISTINCT book_year FROM user_books ORDER BY book_year DESC';
  db.query(sql, (err, data) => {
    if (err) {
      console.error('Error in /years:', err);
      return res
        .status(500)
        .json({ error: 'Database error', details: err.message });
    }
    res.json(data);
  });
});

app.get('/galleries', (req, res) => {
  const galleryPath = path.join(__dirname, 'gallery_images');

  // First check if the directory exists
  if (!fs.existsSync(galleryPath)) {
    fs.mkdirSync(galleryPath, { recursive: true });
    return res.json([]);
  }

  fs.readdir(galleryPath, (err, years) => {
    if (err) {
      console.error('Error reading gallery directory:', err);
      return res.status(500).json({ error: 'Error reading gallery directory' });
    }

    try {
      const galleries = years
        .filter((year) => {
          const yearPath = path.join(galleryPath, year);
          return fs.existsSync(yearPath) && fs.statSync(yearPath).isDirectory();
        })
        .map((year) => {
          const yearPath = path.join(galleryPath, year);
          const images = fs
            .readdirSync(yearPath)
            .filter((file) => {
              const ext = path.extname(file).toLowerCase();
              return ['.jpg', '.jpeg', '.png', '.gif'].includes(ext);
            })
            .map((file) => ({
              id: `${year}-${file}`,
              title: file,
              thumbnailUrl: `/gallery_images/${year}/${file}`,
              url: `/gallery_images/${year}/${file}`,
            }));

          return {
            id: year,
            title: year,
            images: images,
          };
        });

      res.json(galleries);
    } catch (error) {
      console.error('Error processing galleries:', error);
      res.status(500).json({ error: 'Error processing galleries' });
    }
  });
});

app.get('/user_bayaans', (req, res) => {
  const { author, bayaan_type } = req.query;
  let sql = 'SELECT * FROM user_bayaans WHERE bayaan_author = ?';
  const params = [author];

  if (bayaan_type) {
    sql += ' AND bayaan_type = ?';
    params.push(bayaan_type);
  }

  sql += ' ORDER BY MONTH(date_created) DESC';

  console.log('SQL:', sql, 'Params:', params);

  db.query(sql, params, (err, data) => {
    if (err) {
      console.error('Error in /user_bayaans:', err);
      return res
        .status(500)
        .json({ error: 'Database error', details: err.message });
    }
    res.json(data);
  });
});

app.get('/responses', (req, res) => {
  let sql = 'SELECT * FROM responses';

  db.query(sql, (err, data) => {
    if (err) {
      console.error('Error in /get_responses:', err);
      return res
        .status(500)
        .json({ error: 'Database error', details: err.message });
    }
    res.json(data);
  });
});


app.use((req, res, next) => {
  console.log('Request Body:', req.body);
  console.log('Request Headers:', req.headers);
  next();
});



app.post('/responses', (req, res) => {
  const q = 'INSERT INTO responses(`email`, `subject`, `message`) VALUES (?)';

  const values = [req.body.email, req.body.subject, req.body.message];

  db.query(q, [values], (err, data) => {
    if (err) {
      console.error('Database error:', err);
      return res
        .status(500)
        .json({ error: 'Database error', details: err.message });
    }
    console.log('Response recorded successfully');
    return res.status(201).json({ message: 'Response recorded successfully' });
  });
});

// app.post('/responses', (req, res) => {
//   // Hardcoded data
//   const email = 'test@example.com';
//   const subject = 'Test Subject';
//   const message = 'This is a test message.';
//   const id = 100;

//   const query = `
//     INSERT INTO responses (id, email, subject, message)
//   VALUES (1, ?, ?, ?)
//   `;
//   const values = [id, email, subject, message];

//   // Execute the query
//   db.query(query, values, (err, data) => {
//     if (err) {
//       console.error('Database error:', err);
//       return res.status(500).json({ error: 'Database error' });
//     }

//     console.log('Record created successfully');
//     res.status(201).json({ message: 'Record created successfully' });
//   });
// });

const PORT = 8081;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
