const { chromium } = require('playwright');

const URL =
  'https://ticketshop.psv.nl/nl-NL/events/psv%20-%20sc%20heerenveen/2026-10-9_20.00/philips%20stadion?hallmap';

const VAKKEN = ['T', 'TT', 'U'];

async function sendTelegram(message) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    console.log('Telegram secrets ontbreken');
    return;
  }

  const telegramUrl =
    `https://api.telegram.org/bot${token}/sendMessage`;

  await fetch(telegramUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      chat_id: chatId,
      text: message,
      disable_web_page_preview: false
    })
  });
}

(async () => {
  const browser = await chromium.launch({
    headless: true
  });

  const page = await browser.newPage({
    locale: 'nl-NL',
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
      '(KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36'
  });

  console.log('PSV ticketshop openen...');

  await page.goto(URL, {
    waitUntil: 'domcontentloaded',
    timeout: 60000
  });

  await page.waitForTimeout(10000);

  console.log('URL na laden:', page.url());

  const text = await page.locator('body').innerText();

  console.log('Pagina geladen. Tekstlengte:', text.length);

  let gevonden = [];

  for (const vak of VAKKEN) {
    const regex = new RegExp(
      `VAK\\s+${vak}\\s*[\\s\\S]{0,100}?(\\d+)\\s+plaatsen? beschikbaar`,
      'i'
    );

    const match = text.match(regex);

    if (match) {
      const aantal = Number(match[1]);

      console.log(`Vak ${vak}: ${aantal} beschikbaar`);

      if (aantal > 0) {
        gevonden.push({
          vak,
          aantal
        });
      }
    } else {
      console.log(`Vak ${vak}: niet beschikbaar / niet gevonden`);
    }
  }

  if (gevonden.length > 0) {
    const regels = gevonden
      .map(x => `Vak ${x.vak}: ${x.aantal} beschikbaar`)
      .join('\n');

    const bericht =
      `🚨 PSV-ticket beschikbaar!\n\n` +
      `PSV – sc Heerenveen\n` +
      `${regels}\n\n` +
      URL;

    await sendTelegram(bericht);

    console.log('Telegram-melding verstuurd');
  } else {
    console.log('Geen gewenste vakken beschikbaar');
  }

  await browser.close();
})();
