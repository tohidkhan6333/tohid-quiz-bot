require('dotenv').config();
const inquirer = require('inquirer');
const chalk = require('chalk');
const qrcode = require('qrcode-terminal'); // ✅ नई लाइब्रेरी जोड़ें
const { default: makeWASocket, useSingleFileAuthState, Browsers } = require('@whiskeysockets/baileys');
const fs = require('fs');
const path = require('path');
const config = require('./config');

console.log(chalk.blue.bold(`
╔══════════════════════════════════════╗
║        🔐 ${config.BOT_NAME} Pairing      ║
║        👑 ${config.OWNER_NAME}            ║
╚══════════════════════════════════════╝
`));

async function pairBot() {
    try {
        console.log(chalk.cyan('📱 Starting QR Code pairing...\n'));

        // 🔄 Single File Auth State का उपयोग
        const authFile = './auth.json';
        const { state, saveState } = useSingleFileAuthState(authFile);

        // Create socket for pairing
        const sock = makeWASocket({
            auth: state,
            printQRInTerminal: true, // ✅ टर्मिनल में QR दिखाएगा
            browser: Browsers.ubuntu('Chrome'),
            markOnlineOnConnect: false
        });

        // Save credentials when updated
        sock.ev.on('creds.update', saveState);

        // Handle connection events
        sock.ev.on('connection.update', async (update) => {
            const { connection, qr } = update;

            if (qr) {
                // ✅ QR कोड टर्मिनल पर दिखाएं
                console.log(chalk.yellow.bold('\n📲 Scan this QR Code with your phone:'));
                qrcode.generate(qr, { small: true });
                console.log(chalk.cyan('\n📋 Instructions:'));
                console.log(chalk.white('1. Open WhatsApp on your phone'));
                console.log(chalk.white('2. Tap on ⋮ (Menu) → Linked Devices'));
                console.log(chalk.white('3. Tap on "Link a Device"'));
                console.log(chalk.white('4. Scan the QR code above\n'));
            }

            if (connection === 'connecting') {
                console.log(chalk.blue('🔄 Connecting to WhatsApp servers...'));
            }

            if (connection === 'open') {
                console.log(chalk.green('✅ Connected to WhatsApp!'));
                saveState();

                // Get bot info
                const botJid = sock.user?.id;
                const botNumber = botJid?.split('@')[0];

                if (botNumber) {
                    console.log(chalk.green(`🤖 Your bot is using number: ${botNumber}`));
                }

                // 🔄 auth.json की सामग्री दिखाएँ
                console.log(chalk.green.bold('\n🎉 Pairing completed successfully!'));
                console.log(chalk.cyan.bold('\n══════════════════════════════════════'));
                console.log(chalk.cyan.bold('📋 COPY THE AUTH DATA BELOW FOR RENDER:'));
                console.log(chalk.cyan.bold('══════════════════════════════════════\n'));

                const authData = fs.readFileSync(path.resolve(authFile), 'utf8');
                console.log(chalk.white(authData));

                console.log(chalk.cyan.bold('\n══════════════════════════════════════'));
                console.log(chalk.cyan('💡 Copy ALL text above (from { to })'));
                console.log(chalk.cyan('   and paste it as SESSION_DATA in Render'));
                console.log(chalk.cyan.bold('══════════════════════════════════════\n'));

                console.log(chalk.cyan('🚀 You can now deploy the bot to Render.'));

                // Auto-exit after some time
                setTimeout(() => {
                    console.log(chalk.blue('\n🔄 Closing pairing session...'));
                    sock.end();
                    process.exit(0);
                }, 15000);
            }

            if (connection === 'close') {
                console.log(chalk.red('❌ Connection closed. Please try again.'));
                process.exit(1);
            }
        });

        // Handle process termination
        process.on('SIGINT', async () => {
            console.log(chalk.yellow('\n🛑 Pairing cancelled by user'));
            sock.end();
            process.exit(0);
        });

    } catch (error) {
        console.error(chalk.red('❌ Pairing failed:'), error);
        process.exit(1);
    }
}

// ✅ नई dependency जोड़ें
console.log(chalk.yellow('⚠️  Installing qrcode-terminal...'));
const { execSync } = require('child_process');
try {
    execSync('npm install qrcode-terminal --no-save', { stdio: 'inherit' });
    console.log(chalk.green('✅ qrcode-terminal installed.'));
} catch (e) {
    console.log(chalk.yellow('⚠️  Could not install automatically. Please run:'));
    console.log(chalk.white('   npm install qrcode-terminal'));
}

pairBot();
