require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt')
const cookieParser = require('cookie-parser');
const mysql = require('mysql2/promise');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const nodemailer = require('nodemailer');

const app = express();
const PORT = 8081;



app.use(bodyParser.json());
app.use(cookieParser());
app.use(cors());
app.use(express.static('public/common'));


const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 10000 // 10 seconds (adjust as needed)
});

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL,
    pass: process.env.EMAIL_PASSWORD, 
  },
});
app.post('/send-announcement', async (req, res) => {
  const { message, recipient } = req.body;
  try {
      if (recipient === 'everyone') {
          const connection = await pool.getConnection();
          const [results] = await connection.execute('SELECT email FROM account');
          connection.release();
          results.forEach(({ email }) => {
              sendEmail(email, message);
          });
          res.send('Announcement sent successfully');
      } else {
          sendEmail(recipient, message);
          res.send('Announcement sent successfully');
      }
  } catch (error) {
      console.error('Error occurred while sending announcement:', error);
      res.status(500).send('Error occurred while sending announcement');
  }
});


function sendEmail(to, message) {
  const mailOptions = {
      from:  process.env.EMAIL,
      to: to,
      subject: 'Announcement',
      html: `<html>
          <head></head>
          <body>
              <h1>📢 Announcement</h1>
              <p>${message}</p>
              <p>Best regards,<br>The Eatsplorer Team</p>
          </body>
      </html>`
  };

  transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
          console.error('Error occurred while sending email:', error);
      } else {
          console.log('Email sent to:', to);
      }
  });
}


const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/common');
  },
  filename: (req, file, cb) => {
    cb(null, file.fieldname + "_" + Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage: storage });
app.post('/insert', upload.fields([{ name: 'logo' }, { name: 'image2' }]), async (req, res) => {
  const { feName, barangay, description, location, ave, phone, email, latitude, longitude, monday_opening, monday_closing, tuesday_opening, tuesday_closing, wednesday_opening, wednesday_closing, thursday_opening, thursday_closing, friday_opening, friday_closing, saturday_opening, saturday_closing, sunday_opening, sunday_closing } = req.body;
  const textColumns = ['feName', 'barangay', 'description', 'location', 'ave', 'phone', 'email', 'latitude', 'longitude', 'monday_opening', 'monday_closing', 'tuesday_opening', 'tuesday_closing', 'wednesday_opening', 'wednesday_closing', 'thursday_opening', 'thursday_closing', 'friday_opening', 'friday_closing', 'saturday_opening', 'saturday_closing', 'sunday_opening', 'sunday_closing' ];
  const imageColumns = ['logo', 'image2'];

  try {
    const connection = await pool.getConnection();

    const textValues = textColumns.map(column => req.body[column]);
    const imageValues = imageColumns.map(column => req.files[column]?.[0]?.filename);
    const values = [...imageValues, ...textValues];

    const insertQuery = `INSERT INTO images (${[...imageColumns, ...textColumns].join(', ')}) VALUES (${values.map(() => '?').join(', ')})`;
    
    const result = await connection.query(insertQuery, values);
    connection.release();

    console.log('Data inserted successfully');
    res.status(200).json({ message: 'Text and images uploaded successfully' });
  } catch (error) {
    console.error('Error uploading text and images:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.post('/update', upload.fields([{ name: 'logo' }, { name: 'image2' }]), async (req, res) => {
  const { id, feName, barangay, description, location, ave, phone, email, latitude, longitude, monday_opening, monday_closing, tuesday_opening, tuesday_closing, wednesday_opening, wednesday_closing, thursday_opening, thursday_closing, friday_opening, friday_closing, saturday_opening, saturday_closing, sunday_opening, sunday_closing } = req.body;
  const textColumns = ['feName', 'barangay', 'description', 'location', 'ave', 'phone', 'email', 'latitude', 'longitude', 'monday_opening', 'monday_closing', 'tuesday_opening', 'tuesday_closing', 'wednesday_opening', 'wednesday_closing', 'thursday_opening', 'thursday_closing', 'friday_opening', 'friday_closing', 'saturday_opening', 'saturday_closing', 'sunday_opening', 'sunday_closing' ];

  try {
    const connection = await pool.getConnection();

    const textValues = textColumns.map(column => req.body[column]);

    // Check if new logo and image2 files were uploaded
    const logoPath = req.files['logo'] ? req.files['logo'][0].filename : null;
    const image2Path = req.files['image2'] ? req.files['image2'][0].filename : null;

    // Construct the update query
    let updateQuery = `UPDATE images SET `;
    const updateValues = [];
    textColumns.forEach((column, index) => {
      updateQuery += `${column} = ?, `;
      updateValues.push(textValues[index]);
    });

    // If new logo or image2 files were uploaded, update the corresponding columns
    if (logoPath) {
      updateQuery += `logo = ?, `;
      updateValues.push(logoPath);
    }
    if (image2Path) {
      updateQuery += `image2 = ?, `;
      updateValues.push(image2Path);
    }

    // Remove the trailing comma and space from the updateQuery
    updateQuery = updateQuery.slice(0, -2);

    // Add the WHERE clause for the id
    updateQuery += ` WHERE id = ?`;
    updateValues.push(id);

    const result = await connection.query(updateQuery, updateValues);
    connection.release();

    console.log('Data updated successfully');
    res.status(200).json({ message: 'Data updated successfully' });
  } catch (error) {
    console.error('Error updating data:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});



app.get('/abcd', async (req, res)=> {
  try {
    const connection = await pool.getConnection();
    const [rows, fields] = await connection.execute("SELECT * FROM images ORDER BY ave ASC");
    connection.release();
    return res.json(rows);
  } catch (err) {
    console.error('Error executing query:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});
app.get('/establishment', async (req, res)=> {
  try {
    const connection = await pool.getConnection();
    const [rows, fields] = await connection.execute("SELECT COUNT(*) AS count FROM images");
    connection.release();
    return res.json(rows);
  } catch (err) {
    console.error('Error executing query:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});
app.get('/user', async (req, res)=> {
  try {
    const connection = await pool.getConnection();
    const [rows, fields] = await connection.execute("SELECT COUNT(*) AS count FROM account");
    connection.release();
    return res.json(rows);
  } catch (err) {
    console.error('Error executing query:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});
app.get('/rank', async (req, res)=> {
  try {
    const connection = await pool.getConnection();
    const [rows, fields] = await connection.execute("SELECT * FROM images ORDER BY ave DESC LIMIT 10");
    connection.release();
    return res.json(rows);
  } catch (err) {
    console.error('Error executing query:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/ssr', async (req, res)=> {
  try {
    const connection = await pool.getConnection();
    const [rows, fields] = await connection.execute("SELECT * FROM ratings");
    connection.release();
    return res.json(rows);
  } catch (err) {
    console.error('Error executing query:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});
  app.get('/rating', async (req, res)=> {
    try {
      const connection = await pool.getConnection();
      const [rows, fields] = await connection.execute("SELECT COUNT(*) AS count FROM ratings");
      connection.release();
      return res.json(rows);
    } catch (err) {
      console.error('Error executing query:', err);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
});
app.get('/fe_pic', async (req, res)=> {
  try {
    const connection = await pool.getConnection();
    const [rows, fields] = await connection.execute("SELECT * FROM fepic");
    connection.release();
    return res.json(rows);
  } catch (err) {
    console.error('Error executing query:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});
app.get('/fe_menu', async (req, res)=> {
  try {
    const connection = await pool.getConnection();
    const [rows, fields] = await connection.execute("SELECT * FROM femenu");
    connection.release();
    return res.json(rows);
  } catch (err) {
    console.error('Error executing query:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
})
app.get('/type', async (req, res)=> {
  try {
    const connection = await pool.getConnection();
    const [rows, fields] = await connection.execute("SELECT * FROM Types");
    connection.release();
    return res.json(rows);
  } catch (err) {
    console.error('Error executing query:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});
app.post('/upload/ttype', async (req, res) => {
  const { selectedOption, type } = req.body;

  try {
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    const query = 'INSERT INTO types (feName, type) VALUES (?, ?)';
    const values = [selectedOption, type];
    const result = await connection.query(query, values);

    await connection.commit();
    connection.release();

    res.status(201).json({
      id: result.insertId,
      selectedOption,
      type
    });
  } catch (error) {
    console.error('Error creating post:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
app.get('/acc', async (req, res)=> {
  try {
    const connection = await pool.getConnection();
    const [rows, fields] = await connection.execute("SELECT id, Username, Email FROM account");
    connection.release();
    return res.json(rows);
  } catch (err) {
    console.error('Error executing query:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.post('/upload/fepic', upload.fields([{ name: 'image1' }]), async (req, res) => {
  const { selectedOption } = req.body;
  const { image1 } = req.files;

  try {
      const connection = await pool.getConnection();

      const insertQuery = `INSERT INTO fepic (image, feName) VALUES (?, ?)`;
      const values = [image1[0].filename, selectedOption];

      await Promise.all([
          connection.query(insertQuery, values),
          connection.release()
      ]);

      console.log('Data inserted successfully');
      res.status(200).json({ message: 'Text and images uploaded successfully' });
  } catch (error) {
      console.error('Error uploading text and images:', error);
      res.status(500).json({ error: 'Internal Server Error' });
  }
});
app.post('/upload/femenu', upload.fields([{ name: 'menu' }]), async (req, res) => {
  const { selectedOption } = req.body;
  const { menu } = req.files;

  try {
      const connection = await pool.getConnection();

      const insertQuery = `INSERT INTO femenu (menu, feName) VALUES (?, ?)`;
      const values = [menu[0].filename, selectedOption];

      await Promise.all([
          connection.query(insertQuery, values),
          connection.release()
      ]);

      console.log('Data inserted successfully');
      res.status(200).json({ message: 'Text and images uploaded successfully' });
  } catch (error) {
      console.error('Error uploading text and images:', error);
      res.status(500).json({ error: 'Internal Server Error' });
  }
});
app.delete('/acc_delete', async (req, res) => {
  const { id } = req.body;

  try {
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    const queryDeleteComment = 'DELETE FROM account WHERE id = ?';
    await connection.query(queryDeleteComment, [id]);

    await connection.commit();
    connection.release();

    res.status(200).json({ message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Error deleting comment:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
app.delete('/rate_delete', async (req, res) => {
  const { id } = req.body;

  try {
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    const queryDeleteComment = 'DELETE FROM ratings WHERE id = ?';
    await connection.query(queryDeleteComment, [id]);

    await connection.commit();
    connection.release();

    res.status(200).json({ message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Error deleting comment:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
app.delete('/image_delete', async (req, res) => {
  const { id } = req.body;

  try {
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    const queryDeleteComment = 'DELETE FROM fepic WHERE id = ?';
    await connection.query(queryDeleteComment, [id]);

    await connection.commit();
    connection.release();

    res.status(200).json({ message: 'Image deleted successfully' });
  } catch (error) {
    console.error('Error deleting comment:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
app.delete('/menu_delete', async (req, res) => {
  const { id } = req.body;

  try {
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    const queryDeleteComment = 'DELETE FROM femenu WHERE id = ?';
    await connection.query(queryDeleteComment, [id]);

    await connection.commit();
    connection.release();

    res.status(200).json({ message: 'Menu deleted successfully' });
  } catch (error) {
    console.error('Error deleting comment:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
app.delete('/type_delete', async (req, res) => {
  const { id } = req.body;

  try {
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    const queryDeleteComment = 'DELETE FROM types WHERE id = ?';
    await connection.query(queryDeleteComment, [id]);

    await connection.commit();
    connection.release();

    res.status(200).json({ message: 'Type deleted successfully' });
  } catch (error) {
    console.error('Error deleting comment:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
app.delete('/eatery_delete', async (req, res) => {
  const { id } = req.body;

  try {
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    const queryDeleteComment = 'DELETE FROM images WHERE id = ?';
    await connection.query(queryDeleteComment, [id]);

    await connection.commit();
    connection.release();

    res.status(200).json({ message: 'Eatery deleted successfully' });
  } catch (error) {
    console.error('Error deleting comment:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
app.post('/upload/femenu', upload.fields([{ name: 'image1' }]), async (req, res) => {
  const { feName } = req.body;
  const { image1 } = req.files;

  try {
      const connection = await pool.getConnection();

      const insertQuery = `INSERT INTO femenu (menu, feName) VALUES (?, ?)`;
      const values = [image1[0].filename, feName];

      await Promise.all([
          connection.query(insertQuery, values),
          connection.release()
      ]);

      console.log('Data inserted successfully');
      res.status(200).json({ message: 'Text and images uploaded successfully' });
  } catch (error) {
      console.error('Error uploading text and images:', error);
      res.status(500).json({ error: 'Internal Server Error' });
  }
});



app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const [rows] = await pool.query('SELECT password, token FROM Admin WHERE username = ? ', [username]);

    if (rows.length === 0) {
      return res.status(401).json({ message: 'Invalid username/email or password.' });
    }
    const user = rows[0];

    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.status(401).json({ message: 'Invalid username/email or password.' });
    }

    return res.status(200).json({ message: 'Login successful!', token: user.token });

  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});
 
app.get('/', async (req, res)=> {
  try {
    const connection = await pool.getConnection();
    const [rows, fields] = await connection.execute("SELECT * FROM images ORDER BY ave DESC");
    connection.release();
    return res.json(rows);
  } catch (err) {
    console.error('Error executing query:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});
app.get('/k090asd0/77273173/hsjds', async (req, res)=> {
  try {
    const connection = await pool.getConnection();
    const [rows, fields] = await connection.execute("SELECT * FROM account");
    connection.release();
    return res.json(rows);
  } catch (err) {
    console.error('Error executing query:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});
app.post('/NewPassword', async (req, res) => {
  const { email, password1 } = req.body;

  try {
      const connection = await pool.getConnection();
      const hashedPassword = await bcrypt.hash(password1, 10);

      const query = 'UPDATE account SET password = ? WHERE email = ?';
      const values = [hashedPassword, email];

      const result = await connection.query(query, values);
      connection.release();

      res.status(200).json({ message: 'User data updated successfully' });
  } catch (error) {
      console.error('Error updating user data:', error);
      res.status(500).json({ error: 'Internal Server Error' });
  }
});
app.get('/fepic', async (req, res)=> {
  try {
    const connection = await pool.getConnection();
    const [rows, fields] = await connection.execute("SELECT * FROM fepic");
    connection.release();
    return res.json(rows);
  } catch (err) {
    console.error('Error executing query:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/femenu', async (req, res)=> {
  try {
    const connection = await pool.getConnection();
    const [rows, fields] = await connection.execute("SELECT * FROM femenu");
    connection.release();
    return res.json(rows);
  } catch (err) {
    console.error('Error executing query:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/famous', async (req, res)=> {
  try {
    const connection = await pool.getConnection();
    const [rows, fields] = await connection.execute("SELECT * FROM images ORDER BY ave DESC LIMIT 3");
    connection.release();
    return res.json(rows);
  } catch (err) {
    console.error('Error executing query:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/display_comment', async (req, res)=> {
  try {
    const connection = await pool.getConnection();
    const [rows, fields] = await connection.execute("SELECT * FROM ratings");
    connection.release();
    return res.json(rows);
  } catch (err) {
    console.error('Error executing query:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/myfavorite', async (req, res)=> {
  try {
    const connection = await pool.getConnection();
    const [rows, fields] = await connection.execute("SELECT * FROM myfavorites");
    connection.release();
    return res.json(rows);
  } catch (err) {
    console.error('Error executing query:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/Types', async (req, res)=> {
  try {
    const connection = await pool.getConnection();
    const [rows, fields] = await connection.execute("SELECT * FROM types");
    connection.release();
    return res.json(rows);
  } catch (err) {
    console.error('Error executing query:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

function generateRandomDigits() {
  return Math.floor(100000 + Math.random() * 900000);
}

app.get('/getRandomDigits', (req, res) => {
  const randomDigits = generateRandomDigits();
  res.json({ digits: randomDigits });
});

app.post('/otp_forgot', async (req, res) => {
  const { email, randomDigits } = req.body;

  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL,
      to: email,
      subject: 'Your Password Reset OTP',
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta http-equiv="X-UA-Compatible" content="IE=edge">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Welcome to Eatsplorer</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    line-height: 1.6;
                    color: #333;
                    background-color: #f5f5f5;
                    margin: 0;
                    padding: 0;
                }
                .container {
                    max-width: 600px;
                    margin: 20px auto;
                    padding: 20px;
                    background-color: #fff;
                    border-radius: 8px;
                    box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
                }
                h1 {
                    color: #EA0909;
                }
                p {
                    margin-bottom: 15px;
                }
                .otp-code {
                    display: inline-block;
                    padding: 8px 12px;
                    background-color: #EA0909;
                    color: #fff;
                    font-weight: bold;
                    border-radius: 4px;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>Welcome to Eatsplorer!</h1>
                <p>Dear User,</p>
                <p>We've received a request to reset your password. Here is your One Time Password (OTP) for </p>
                <p>verification:</p>
                <p class="otp-code">OTP: ${randomDigits}</p>
                <p>Please enter this OTP on the password reset page to complete the process. The OTP is valid for a short period of time.</p>
                <p>If you didn't request this password reset, please ignore this message. Your account security is important to us.</p>
                <p>Thank you for choosing Eatsplorer. Get ready to embark on a gastronomic adventure!</p>
                <p>Best regards,<br>The Eatsplorer Team</p>
            </div>
        </body>
        </html>
      `,
    });

    console.log('Email sent:', info.messageId);
    res.status(200).send('OTP sent successfully');
  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).send('Error sending OTP');
  }
});

app.post('/otp', async (req, res) => {
  const { email, randomDigits } = req.body;

  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL,
      to: email,
      subject: 'Welcome to Eatsplorer - OTP for Account Verification',
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta http-equiv="X-UA-Compatible" content="IE=edge">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Welcome to Eatsplorer</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    line-height: 1.6;
                    color: #333;
                    background-color: #f5f5f5;
                    margin: 0;
                    padding: 0;
                }
                .container {
                    max-width: 600px;
                    margin: 20px auto;
                    padding: 20px;
                    background-color: #fff;
                    border-radius: 8px;
                    box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
                }
                h1 {
                    color: #EA0909;
                }
                p {
                    margin-bottom: 15px;
                }
                .otp-code {
                    display: inline-block;
                    padding: 8px 12px;
                    background-color: #EA0909;
                    color: #fff;
                    font-weight: bold;
                    border-radius: 4px;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>Welcome to Eatsplorer!</h1>
                <p>Dear User,</p>
                <p>We are thrilled to have you join our community of food enthusiasts. Before you embark on your culinary journey with us, we need to verify your email address to ensure the security of your account.</p>
                <p>Please use the following 6-digit OTP (One-Time Password) to complete the account verification process:</p>
                <p class="otp-code">OTP: ${randomDigits}</p>
                <p>Note: This OTP is valid for a limited time. If you haven't initiated this request, please disregard this email.</p>
                <p>Eatsplorer is committed to providing you with a delightful experience as you explore the world of flavors. If you have any questions or need assistance, feel free to reach out to our support team.</p>
                <p>Thank you for choosing Eatsplorer. Get ready to embark on a gastronomic adventure!</p>
                <p>Best regards,<br>The Eatsplorer Team</p>
            </div>
        </body>
        </html>
      `,
    });

    console.log('Email sent:', info.messageId);
    res.status(200).send('OTP sent successfully');
  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).send('Error sending OTP');
  }
});

app.post('/account/was/created', async (req, res) => {
  const { username, password, email} = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const query = 'INSERT INTO account (username, password, email) VALUES (?, ?, ?)';
    const values = [username, hashedPassword, email]; 
    
    const connection = await pool.getConnection();
    const result = await connection.query(query, values);
    connection.release();

    res.status(201).json({ id: result.insertId, username, email });
  } catch (error) {
    console.error('Error creating post:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.post('/Log_in', async (req, res) => {
  const { username, password } = req.body;
  try {
    const connection = await pool.getConnection();
    const [rows, fields] = await connection.execute('SELECT id, password FROM account WHERE username = ?', [username]);
    connection.release();

    if (rows.length > 0) {
      const hashedPassword = rows[0].password;
      const passwordMatch = await bcrypt.compare(password, hashedPassword);
      if (passwordMatch) {
        res.status(200).send('Login successful');
      } else {
        res.status(401).send('Invalid credentials');
      }
    } else {
      res.status(404).send('User not found');
    }
  } catch (error) {
    console.error('MySQL query error:', error);
    res.status(500).send('Error logging in');
  }
});

app.post('/comment', async (req, res) => {
  const { username, comment, counter, feNameQuery } = req.body;
  const secret_date = new Date();

  try {
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    const q1 = 'UPDATE images SET ave = ave + 1 WHERE feName = ?;';
    await connection.query(q1, [feNameQuery]);

    const query = 'INSERT INTO ratings (username, Comment, Ratings, Rate_date, feName) VALUES (?, ?, ?, ?, ?)';
    const values = [username, comment, counter, secret_date, feNameQuery];
    const result = await connection.query(query, values);

    await connection.commit();
    connection.release();

    res.status(201).json({
      id: result.insertId,
      username,
      comment,
      counter,
      secret_date,
      feNameQuery,
    });
  } catch (error) {
    console.error('Error creating post:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.post('/comment_update', async (req, res) => {
  const { username, comment, counter, feNameQuery } = req.body;
  const secret_date = new Date();

  try {
    const connection = await pool.getConnection();

    const query = `
      UPDATE ratings
      SET Comment = ?, Ratings = ?, Rate_date = ?
      WHERE username = ? AND feName = ?;
    `;
    const values = [comment, counter, secret_date, username, feNameQuery];

    const result = await connection.query(query, values);
    connection.release();

    res.status(201).json({
      id: result.insertId,
      username,
      comment,
      counter,
      secret_date,
      feNameQuery,
    });
  } catch (error) {
    console.error('Error updating comment:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.delete('/comment_delete', async (req, res) => {
  const { username, feNameQuery } = req.body;

  try {
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    const queryGetAve = 'SELECT ave FROM images WHERE feName = ?';
    const [results] = await connection.query(queryGetAve, [feNameQuery]);
    const currentAve = results[0].ave;

    const queryUpdateAve = 'UPDATE images SET ave = ? WHERE feName = ?';
    await connection.query(queryUpdateAve, [currentAve - 1, feNameQuery]);

    const queryDeleteComment = 'DELETE FROM ratings WHERE username = ? AND feName = ?';
    await connection.query(queryDeleteComment, [username, feNameQuery]);

    await connection.commit();
    connection.release();

    res.status(200).json({ message: 'Comment deleted successfully' });
  } catch (error) {
    console.error('Error deleting comment:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.post('/myfavorites', async (req, res) => {
  const { username, feNameQuery, formData } = req.body;
  const { feType, barangay, logo } = formData;

  try {
    const query = 'INSERT INTO myfavorites (username, feName, feType, barangay, logo) VALUES (?, ?, ?, ?, ?)';
    const values = [username, feNameQuery, feType, barangay, logo];

    const connection = await pool.getConnection();
    const result = await connection.query(query, values);
    connection.release();

    res.status(201).json({ id: result.insertId, username, feNameQuery, feType, barangay, logo});
  } catch (error) {
    console.error('Error creating post:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.delete('/delete_myfavorites', async (req, res) => {
  const { username, feNameQuery} = req.body;

  try {
    const query = 'DELETE FROM myfavorites WHERE username = ? AND feName = ?';
    const connection = await pool.getConnection();
    const result = await connection.query(query, [username, feNameQuery]);
    connection.release();

    res.status(200).json({ message: 'Comment deleted successfully' });
  } catch (error) {
    console.error('Error deleting comment:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


app.post('/logout', (req, res) => {
  res.clearCookie('username');
  res.status(200).json({ message: 'Logout successful' });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});


