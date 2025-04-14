require('dotenv').config();
const express = require('express');
const multer = require('multer');
const nodemailer = require('nodemailer');
const path = require('path');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const fs = require('fs');
const adminRoutes = require('../routes/');

const app = express();
app.use(cors());
app.use(express.json());
app.use(cookieParser());
app.use('/api/admin', adminRoutes); // ← Prefix matches frontend
const upload = multer({ storage: multer.memoryStorage() });
// Static files
app.use(express.static(path.join(__dirname, '../project')));
app.use('/css', express.static(path.join(__dirname, '../css')));
app.use('/js', express.static(path.join(__dirname, '../js')));
app.use('/images', express.static(path.join(__dirname, '../images')));

// ========================
// ADMIN AUTHENTICATION CODE
// ========================

const ADMIN_CREDENTIALS = {
    username: process.env.ADMIN_USERNAME,
    password: process.env.ADMIN_PASSWORD 
};

const rateLimit = require('express-rate-limit');
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: 'Too many login attempts, please try again later'
});


app.post('/api/admin/login', loginLimiter, (req, res) => {
    const { username, password } = req.body;
    
    if (username === ADMIN_CREDENTIALS.username && 
        password === ADMIN_CREDENTIALS.password) {
        
        const token = jwt.sign(
            { username },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '8h' }
        );
        
        res.cookie('adminToken', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 8 * 60 * 60 * 1000,
            sameSite: 'strict'
        });
        
        res.json({ token });
    } else {
        res.status(401).json({ error: 'Invalid credentials' });
    }
});

app.post('/api/admin/logout', (req, res) => {
    res.clearCookie('adminToken', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/'
    });
    res.json({ success: true });
});

const authenticateAdmin = (req, res, next) => {
    const token = req.cookies.adminToken || req.headers.authorization?.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }
    
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        req.admin = decoded;
        next();
    } catch (err) {
        res.status(401).json({ error: 'Invalid token' });
    }
};

app.use('/api/admin/*', authenticateAdmin);

app.use('/admin', (req, res, next) => {
    if (req.path === '/login.html' || 
        req.path.startsWith('/css/') || 
        req.path.startsWith('/js/') ||
        req.path.startsWith('/images/')) {
        return next();
    }
    
    const token = req.cookies.adminToken;
    
    if (!token) {
        return res.redirect('/admin/login.html');
    }
    
    try {
        jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        next();
    } catch (err) {
        res.redirect('/admin/login.html');
    }
});

app.use('/admin', express.static(path.join(__dirname, '../admin')));

// ========================
// ESTIMATE TRACKING SYSTEM
// ========================

const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR);
}

const ESTIMATES_FILE = path.join(DATA_DIR, 'estimates.json');
if (!fs.existsSync(ESTIMATES_FILE)) {
    fs.writeFileSync(ESTIMATES_FILE, JSON.stringify([]));
}

function readEstimates() {
    const data = fs.readFileSync(ESTIMATES_FILE);
    return JSON.parse(data);
}

function saveEstimates(estimates) {
    fs.writeFileSync(ESTIMATES_FILE, JSON.stringify(estimates, null, 2));
}

// Modified estimate endpoint to store submissions
app.post('/api/send-estimate', upload.array('blueprintFiles'), async (req, res) => {
  try {
      const estimates = readEstimates();
      
      // Define newEstimate first
      const newEstimate = {
          id: Date.now().toString(),
          date: new Date().toISOString(),
          fullName: req.body.fullName,
          email: req.body.email,
          phone: req.body.phone,
          projectType: req.body.projectType,
          services: req.body.services ? 
              (Array.isArray(req.body.services) ? req.body.services : [req.body.services]) : 
              [],
          projectDescription: req.body.projectDescription,
          files: req.files?.map(file => ({
              originalname: file.originalname,
              mimetype: file.mimetype,
              size: file.size
          })) || []
      };

      // Now push to estimates
      estimates.push(newEstimate);
      saveEstimates(estimates);

      // Validate email recipient
      const receivingEmail = process.env.RECEIVING_EMAIL;
      if (!receivingEmail) {
          throw new Error('No receiving email configured');
      }

      const mailOptions = {
          from: `"ThermaCore Forms" <${process.env.GMAIL_USER}>`,
          to: receivingEmail,
          subject: `New Estimate Request: ${newEstimate.fullName}`,  // Use newEstimate here
          headers: {
              'X-Mailer': 'ThermaCore Estimate System',
              'X-Priority': '1',
              'X-MSMail-Priority': 'High',
              'X-Auto-Response-Suppress': 'All',
              'Precedence': 'bulk'
          },
          priority: 'high',
          html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px;">
                  <h2 style="color: #e74c3c;">New Estimate Request</h2>
                  <table cellpadding="10" border="1" style="border-collapse: collapse; width: 100%;">
                      <tr><th style="text-align: left; padding: 8px; background: #f2f2f2;">Name</th><td style="padding: 8px;">${newEstimate.fullName}</td></tr>
                      <tr><th style="text-align: left; padding: 8px; background: #f2f2f2;">Email</th><td style="padding: 8px;">${newEstimate.email}</td></tr>
                      <tr><th style="text-align: left; padding: 8px; background: #f2f2f2;">Phone</th><td style="padding: 8px;">${newEstimate.phone}</td></tr>
                      <tr><th style="text-align: left; padding: 8px; background: #f2f2f2;">Project Type</th><td style="padding: 8px;">${newEstimate.projectType}</td></tr>
                      <tr><th style="text-align: left; padding: 8px; background: #f2f2f2;">Services</th><td style="padding: 8px;">${newEstimate.services.join(', ') || 'None'}</td></tr>
                  </table>
                  <h3 style="margin-top: 20px; color: #333;">Project Description:</h3>
                  <p style="line-height: 1.6;">${newEstimate.projectDescription}</p>
                  ${newEstimate.files.length ? `<p style="font-size: 14px; color: #666;">📎 ${newEstimate.files.length} file(s) attached</p>` : ''}
              </div>
          `,
          attachments: newEstimate.files.map(file => ({
              filename: file.originalname,
              content: file.buffer,
              contentType: file.mimetype
          }))
      };

      // Verify mail options before sending
      if (!mailOptions.to) {
          throw new Error('No recipient email address specified');
      }

      const info = await sendEmailWithRetry(mailOptions);
      console.log('Email sent:', info.messageId);
      
      res.json({ success: true, id: newEstimate.id });
  } catch (error) {
      console.error('Error processing estimate:', error);
      res.status(500).json({ 
          error: 'Submission failed',
          details: error.message,
          stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
  }
});

app.get('/api/admin/estimates', authenticateAdmin, (req, res) => {
  try {
      const estimates = readEstimates();
      // Return newest first
      const sortedEstimates = [...estimates].reverse(); 
      res.json(sortedEstimates);
  } catch (error) {
      console.error('Error fetching estimates:', error);
      res.status(500).json({ 
          error: 'Failed to fetch estimates',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
  }
});

// New endpoints for admin panel
app.get('/api/admin/estimates-count', authenticateAdmin, (req, res) => {
    try {
        const estimates = readEstimates();
        res.json({ count: estimates.length });
    } catch (error) {
        res.status(500).json({ error: 'Failed to get count' });
    }
});
app.get('/api/admin/estimates/:id', authenticateAdmin, async (req, res) => {
  try {
      const estimate = await Estimate.findById(req.params.id);
      if (!estimate) {
          return res.status(404).json({ error: 'Estimate not found' });
      }
      res.json(estimate);
  } catch (error) {
      console.error('Error fetching estimate:', error);
      res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/admin/recent-estimates', authenticateAdmin, (req, res) => {
    try {
        const estimates = readEstimates()
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 5);
        res.json(estimates);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch recent estimates' });
    }
});

// ========================
// EXISTING CODE BELOW
// ========================

app.get('/api/test', (req, res) => {
    res.json({ message: "API works!" });
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../project/index.html'));
});

app.get('/admin*', (req, res) => {
    res.sendFile(path.join(__dirname, '../admin/index.html'));
});

const createTransporter = () => {
    return nodemailer.createTransport({
        service: 'gmail',
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: {
            user: process.env.GMAIL_USER,
            pass: process.env.GMAIL_PASS
        },
        pool: true,
        maxConnections: 1,
        maxMessages: 10,
        socketTimeout: 30000,
        connectionTimeout: 30000,
        greetingTimeout: 15000,
        debug: true
    });
};

const verifyGmailConnection = async () => {
    const transporter = createTransporter();
    try {
        await transporter.verify();
        console.log('Server is ready to send emails');
        return true;
    } catch (error) {
        console.error('Gmail connection verification failed:', error);
        return false;
    }
};

const sendEmailWithRetry = async (mailOptions, retries = 3) => {
    const transporter = createTransporter();

    for (let i = 0; i < retries; i++) {
        try {
            return await transporter.sendMail(mailOptions);
        } catch (err) {
            if (i === retries - 1) throw err;
            console.log(`Attempt ${i + 1} failed, retrying in ${2 * (i + 1)} seconds...`);
            await new Promise(resolve => setTimeout(resolve, 2000 * (i + 1)));
        }
    }
};



app.post('/api/contact', express.json(), async (req, res) => {
    try {
        if (!req.body.name || !req.body.email || !req.body.subject || !req.body.message) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields'
            });
        }

        const mailOptions = {
            from: `"ThermaCore Contact Form" <${process.env.GMAIL_USER}>`,
            to: process.env.CONTACT_EMAIL || process.env.RECEIVING_EMAIL,
            subject: `New Contact Message: ${req.body.subject}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px;">
                    <h2 style="color: #e74c3c;">New Contact Message</h2>
                    <table cellpadding="10" border="1" style="border-collapse: collapse; width: 100%;">
                        <tr><th style="text-align: left; padding: 8px; background: #f2f2f2;">Name</th><td style="padding: 8px;">${req.body.name}</td></tr>
                        <tr><th style="text-align: left; padding: 8px; background: #f2f2f2;">Email</th><td style="padding: 8px;">${req.body.email}</td></tr>
                        ${req.body.phone ? `<tr><th style="text-align: left; padding: 8px; background: #f2f2f2;">Phone</th><td style="padding: 8px;">${req.body.phone}</td></tr>` : ''}
                        <tr><th style="text-align: left; padding: 8px; background: #f2f2f2;">Subject</th><td style="padding: 8px;">${req.body.subject}</td></tr>
                    </table>
                    <h3 style="margin-top: 20px; color: #333;">Message:</h3>
                    <p style="line-height: 1.6;">${req.body.message}</p>
                    
                    <div style="margin-top: 30px; padding: 15px; background: #f9f9f9; border-left: 4px solid #e74c3c; font-size: 12px;">
                        <p style="margin: 0; color: #666;">
                            <strong>Security Notice:</strong> This email was sent from ThermaCore's contact form. 
                            If you didn't request this, please ignore or contact 
                            <a href="mailto:support@thermacore.com" style="color: #e74c3c;">support@thermacore.com</a>.
                        </p>
                    </div>
                </div>
            `,
            headers: {
                'X-Mailer': 'ThermaCore Contact System',
                'X-Priority': '1',
                'X-MSMail-Priority': 'High'
            },
            priority: 'high'
        };

        const info = await sendEmailWithRetry(mailOptions);
        console.log('Contact email sent:', info.messageId);

        res.json({
            success: true,
            messageId: info.messageId
        });
    } catch (error) {
        console.error('Contact form error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to send message',
            error: error.message
        });
    }
});

if (process.env.VERCEL) {
    module.exports = app;
} else {
    verifyGmailConnection().then(success => {
        if (!success) console.warn('Email service may not work');
        const PORT = process.env.PORT || 3000;
        app.listen(PORT, () => console.log(`Local server running on port ${PORT}`));
    });
}