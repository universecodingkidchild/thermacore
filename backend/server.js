require('dotenv').config();
const express = require('express');
const multer = require('multer');
const nodemailer = require('nodemailer');
import { kv } from '@vercel/kv';
const path = require('path');
const fs = require('fs')
const fsp = require('fs').promises;
const cors = require('cors');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const { PDFDocument, rgb } = require('pdf-lib');
const app = express();
const router = express.Router();
const adminRoutes = require('./routes/admin');

app.use('/api/admin', adminRoutes); // This creates the /api/admin prefix
// Add this near the top of server.js


const contactsRouter = require('./routes/contacts');
app.use('/api/contacts', contactsRouter); // Must come BEFORE static files

app.use(cors());
app.use(express.json());
app.use(cookieParser());
app.use('/api/admin', adminRoutes);

app.get('/api/contacts/test', (req, res) => {
    res.json({ message: "Test endpoint works!", contacts: [] });
});
const upload = multer({ storage: multer.memoryStorage() });
// Static files
app.use(express.static(path.join(__dirname, '../project')));
app.use('/css', express.static(path.join(__dirname, '../css')));
app.use('/js', express.static(path.join(__dirname, '../js')));
app.use('/images', express.static(path.join(__dirname, '../images')));
app.use('/admin', express.static(path.join(__dirname, '../admin')));

// Handle all admin routes
app.get('/admin/*', (req, res) => {
    res.sendFile(path.join(__dirname, '../admin/index.html'));
});
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


// Replace your static file serving with:
if (process.env.VERCEL) {
    app.use('/admin', express.static(path.join(__dirname, '../admin')));
} else {
    app.use('/admin', express.static(path.join(__dirname, '../admin')));
    app.use(express.static(path.join(__dirname, '../project')));
}
const authenticateAdmin = (req, res, next) => {
    // Check both cookie and Authorization header
    const token = req.cookies.adminToken ||
        req.headers.authorization?.split(' ')[1] ||
        req.query.token;


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
const DATA_DIR = process.env.VERCEL ? '/tmp/data' : path.join(__dirname, 'data');
const ESTIMATES_FILE = path.join(DATA_DIR, 'estimates.json');
const CONTACTS_FILE = path.join(DATA_DIR, 'contacts.json');
[ESTIMATES_FILE, CONTACTS_FILE].forEach(file => {
    if (!fs.existsSync(file)) {
        fs.writeFileSync(file, '[]');
    }
});
[path.join(DATA_DIR, 'estimates.json'), path.join(DATA_DIR, 'contacts.json')].forEach(file => {
    if (!fs.existsSync(file)) {
        fs.writeFileSync(file, '[]');
    }
});
const initializeDataFiles = async () => {
    const dataDir = path.join(__dirname, 'data');  // This can stay as dataDir since it's local scope
    const files = {
        contacts: path.join(dataDir, 'contacts.json'),
        estimates: path.join(dataDir, 'estimates.json')
    };
    // ... rest of the function ...

    try {
        await fsp.mkdir(dataDir, { recursive: true });

        for (const [name, filePath] of Object.entries(files)) {
            try {
                await fsp.access(filePath);
            } catch {
                await fsp.writeFile(filePath, '[]', 'utf8');
                console.log(`Created ${name} file at ${filePath}`);
            }
        }
    } catch (error) {
        console.error('Data initialization failed:', error);
        process.exit(1);
    }
};
// Clear contacts endpoint
app.use(cors({
    origin: [
        process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000',
        'http://localhost:3000' // For local testing
    ],
    credentials: true
}));

app.post('/api/clear-contacts', authenticateAdmin, async (req, res) => {
    try {
        await kv.del('contacts');
        res.json({ success: true, message: 'All contacts cleared successfully' });
    } catch (error) {
        res.status(500).json({ success: false, error: "Failed to clear contacts" });
    }
});

// Clear estimates endpoint
app.post('/api/clear-estimates', authenticateAdmin, async (req, res) => {
    try {
        await kv.del('estimates');
        res.json({ success: true, message: 'All estimates cleared successfully' });
    } catch (error) {
        res.status(500).json({ success: false, error: "Failed to clear estimates" });
    }
});
app.post('/api/clear-data/:type', async (req, res) => {
    try {
        const validTypes = ['estimates', 'contacts'];
        if (!validTypes.includes(req.params.type)) {
            return res.status(400).json({ error: 'Invalid data type' });
        }

        await fs.writeFile(
            `./data/${req.params.type}.json`,
            '[]',
            'utf-8'
        );

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
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

        // Also send in response
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



// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initialize files if they don't exist
[ESTIMATES_FILE, CONTACTS_FILE].forEach(file => {
    if (!fs.existsSync(file)) {
        fs.writeFileSync(file, '[]', 'utf8');
    }
});

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
        // Ensure proper content type
        if (!req.is('multipart/form-data')) {
            return res.status(400).json({ 
                success: false,
                error: 'Invalid content type' 
            });
        }

        // Process the form data
        const newEstimate = {
            id: Date.now().toString(),
            date: new Date().toISOString(),
            fullName: req.body.fullName,
            email: req.body.email,
            phone: req.body.phone,
            projectType: req.body.projectType,
            services: req.body.services ? 
                (Array.isArray(req.body.services) ? req.body.services : [req.body.services]) : [],
            projectDescription: req.body.projectDescription,
            files: req.files?.map(file => ({
                originalname: file.originalname,
                mimetype: file.mimetype,
                size: file.size
            })) || []
        };

        // Validate email recipient
        const receivingEmail = process.env.RECEIVING_EMAIL;
        if (!receivingEmail) {
            throw new Error('No receiving email configured');
        }

        // Save to Vercel KV instead of filesystem
        await kv.lpush('estimates', JSON.stringify(newEstimate));
        console.log(`Estimate saved successfully to KV. ID: ${newEstimate.id}`);

        // Send email (your existing mailOptions)
        const mailOptions = {
            from: `"ThermaCore Forms" <${process.env.GMAIL_USER}>`,
            to: receivingEmail,
            subject: `New Estimate Request: ${newEstimate.fullName}`,
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

        res.status(200).json({ 
            success: true,
            message: 'Estimate submitted successfully',
            id: newEstimate.id
        });

    } catch (error) {
        console.error('Estimate submission error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Internal server error',
            message: error.message
        });
    }
});
// Example Express route
router.delete('/api/admin/estimates', async (req, res) => {
    try {
        const { olderThan } = req.query;
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - parseInt(olderThan));

        await Estimate.deleteMany({
            date: { $lt: cutoffDate },
            status: { $ne: 'approved' }
        });

        res.status(200).json({ message: `Deleted estimates older than ${olderThan} days` });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
router.get('/api/admin/estimates/:id/pdf', async (req, res) => {
    try {
        // 1. Get estimate data from your database
        const estimate = await EstimateModel.findById(req.params.id);

        // 2. Create PDF
        const pdfDoc = await PDFDocument.create();
        const page = pdfDoc.addPage([600, 800]);

        // 3. Add content
        const { width, height } = page.getSize();
        page.drawText(`Estimate #${estimate.id}`, {
            x: 50,
            y: height - 50,
            size: 20,
            color: rgb(0, 0, 0)
        });

        // Add more content as needed...

        // 4. Finalize and send
        const pdfBytes = await pdfDoc.save();
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=estimate-${estimate.id}.pdf`);
        res.send(pdfBytes);

    } catch (error) {
        console.error('PDF generation error:', error);
        res.status(500).send('PDF generation failed');
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
app.get('/api/admin/contacts', authenticateAdmin, async (req, res) => {
    try {
        const contacts = await kv.lrange('contacts', 0, -1);
        const parsedContacts = contacts.map(c => JSON.parse(c)).reverse();
        res.json(parsedContacts);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch contacts' });
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
// Add these endpoints alongside your existing estimate endpoints
app.get('/api/admin/contacts-count', authenticateAdmin, (req, res) => {
    try {
        const contactsPath = path.join(__dirname, 'data', 'contacts.json');
        if (!fs.existsSync(contactsPath)) {
            return res.json({ count: 0 });
        }
        const contacts = JSON.parse(fs.readFileSync(contactsPath));
        res.json({ count: contacts.length });
    } catch (error) {
        res.status(500).json({ error: 'Failed to get contacts count' });
    }
});

app.get('/api/admin/recent-contacts', authenticateAdmin, (req, res) => {
    try {
        const contactsPath = path.join(__dirname, 'data', 'contacts.json');
        if (!fs.existsSync(contactsPath)) {
            return res.json([]);
        }
        const contacts = JSON.parse(fs.readFileSync(contactsPath));
        const recentContacts = contacts
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, 5);
        res.json(recentContacts);
    } catch (error) {
        res.status(500).json({ error: 'Failed to get recent contacts' });
    }
});
app.get('/api/admin/estimates', authenticateAdmin, async (req, res) => {
    try {
        const estimates = await kv.lrange('estimates', 0, -1);
        const parsedEstimates = estimates.map(e => JSON.parse(e)).reverse(); // Newest first
        res.json(parsedEstimates);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch estimates' });
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
router.delete('/estimates/all', authenticateAdmin, async (req, res) => {
    try {
        await Estimate.deleteMany({}); // MongoDB
        // For SQL: await Estimate.destroy({ where: {}, truncate: true });
        res.sendStatus(204);
    } catch (error) {
        res.status(500).json({ error: "Failed to delete estimates" });
    }
});
router.delete('/contacts/all', authenticateAdmin, async (req, res) => {
    try {
        await ContactSubmission.deleteMany({});
        res.sendStatus(204);
    } catch (error) {
        res.status(500).json({ error: "Failed to delete contacts" });
    }
});
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



// Update your existing /api/contact endpoint in server.js
app.post('/api/contact', express.json(), async (req, res) => {
    // Debugging: Log incoming request
    console.log("Contact form submission received at:", new Date().toISOString());
    console.log("Request body:", req.body);

    // Validate required fields
    if (!req.body.name || !req.body.email || !req.body.subject || !req.body.message) {
        console.log("Missing required fields");
        return res.status(400).json({
            success: false,
            message: 'Missing required fields'
        });
    }

    try {
        // Create new contact
        const newContact = {
            id: Date.now().toString(),
            name: req.body.name,
            email: req.body.email,
            phone: req.body.phone || '',
            subject: req.body.subject,
            message: req.body.message,
            status: 'new',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        // Save to Vercel KV instead of filesystem
        await kv.lpush('contacts', JSON.stringify(newContact));
        console.log(`Contact saved successfully to KV. ID: ${newContact.id}`);

        // Send email (your existing mailOptions)
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
                            <strong>Submission ID:</strong> ${newContact.id}<br>
                            <strong>Received:</strong> ${new Date(newContact.createdAt).toLocaleString()}
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

        // Send email
        const info = await sendEmailWithRetry(mailOptions);
        console.log('Contact email sent:', info.messageId);

        // Send success response
        res.json({
            success: true,
            messageId: info.messageId,
            contactId: newContact.id
        });

    } catch (error) {
        console.error("Contact submission error:", error);
        res.status(500).json({
            success: false,
            message: 'Failed to process submission',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});
function readContacts() {
    try {
        const data = fs.readFileSync(path.join(__dirname, 'data', 'contacts.json'), 'utf8');
        return JSON.parse(data);
    } catch (err) {
        console.error('Error reading contacts:', err);
        return [];
    }
}

function saveContacts(contacts) {
    try {
        fs.writeFileSync(path.join(__dirname, 'data', 'contacts.json'), JSON.stringify(contacts, null, 2));
    } catch (err) {
        console.error('Error saving contacts:', err);
    }
}


// Call this when starting your server
initializeDataFiles().then(() => {
    console.log('Data files initialized');
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