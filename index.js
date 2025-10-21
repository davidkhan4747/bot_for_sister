const TelegramBot = require('node-telegram-bot-api');

// 👉 Вставь свой токен сюда
const token = '8299836005:AAGDCORBsNRlao8Ni94A76p4m73syAGJnhY';
// prod 8299836005:AAGDCORBsNRlao8Ni94A76p4m73syAGJnhY
// token dev 8201703837:AAE8rX4gm5Nj92G9xrDEmZ-htskYUy019Fo

// 👉 ID сестры (админа) — можно узнать, написав в @userinfobot
const ADMIN_ID = 8449163861;
// prod  296877576
// dev 861442683
// Запускаем бота
const bot = new TelegramBot(token, { polling: true });

// Хранилище для ожидающих ответа сообщений
const pendingReplies = new Map();

// Хранилище сообщений пользователей для контекста
const userMessages = new Map();

// 📨 Пользователь пишет боту
bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;
  
  console.log(`📥 Получено сообщение:`, {
    chatId,
    text,
    hasVoice: !!msg.voice,
    isAdmin: chatId === ADMIN_ID,
    messageType: msg.voice ? 'voice' : msg.text ? 'text' : 'other'
  });
  
  // Обработка голосовых сообщений от пользователей
  if (msg.voice && chatId !== ADMIN_ID) {
    console.log(`🎤 Получено голосовое сообщение от пользователя ${chatId}`);
    
    const userName = msg.from.username ? `@${msg.from.username}` : 'Username yo\'q';
    const fullName = `${msg.from.first_name || ''} ${msg.from.last_name || ''}`.trim();
    const userInfo = fullName ? `${fullName} (${userName})` : userName;
    
    // Сохраняем информацию о голосовом сообщении
    const messageData = {
      text: '[Ovozli xabar]',
      userInfo: userInfo,
      timestamp: new Date().toLocaleString('ru-RU'),
      voice: msg.voice
    };
    
    userMessages.set(String(chatId), messageData);
    
    // Отправляем голосовое сообщение админу (не пересылка, а новое сообщение)
    bot.sendVoice(ADMIN_ID, msg.voice.file_id, {
      caption: `🎤 Голосовое сообщение от пользователя:\n👤 ${userInfo}\n🆔 ID: ${chatId}`
    })
      .then(() => {
        console.log(`✅ Голосовое сообщение отправлено админу`);
        
        // Добавляем кнопки для ответа
        const keyboard = {
          inline_keyboard: [
            [
              { text: '✅ Tez javob', callback_data: `quick_reply_${chatId}` },
              { text: '📝 Javob yozish', callback_data: `write_reply_${chatId}` }
            ],
            [
              { text: '🎤 Ovozli xabar', callback_data: `voice_reply_${chatId}` },
              { text: '📋 Foydalanuvchi haqida', callback_data: `info_${chatId}` }
            ],
            [
              { text: '🚫 Bloklash', callback_data: `block_${chatId}` }
            ]
          ]
        };
        
        bot.sendMessage(ADMIN_ID, `🎤 Голосовое сообщение получено`, {
          reply_markup: keyboard
        });
        
        bot.sendMessage(chatId, '✅ Ovozli xabaringiz administratorga yuborildi. Javobni kuting.');
      })
      .catch((error) => {
        console.error(`❌ Ошибка отправки голосового сообщения:`, error);
        // Если и это не работает, отправляем текстовое уведомление
        bot.sendMessage(ADMIN_ID, `🎤 Пользователь ${userInfo} (ID: ${chatId}) отправил голосовое сообщение, но не удалось его переслать. Проверьте настройки приватности.`);
        bot.sendMessage(chatId, '✅ Ovozli xabaringiz administratorga yuborildi. Javobni kuting.');
      });
    
    return;
  }

  // Обработка голосовых ответов от админа
  if (msg.voice && chatId === ADMIN_ID && pendingReplies.has(ADMIN_ID)) {
    const userId = pendingReplies.get(ADMIN_ID);
    pendingReplies.delete(ADMIN_ID);
    
    console.log(`🎤 Отправляем голосовой ответ пользователю ${userId}`);
    
    // Получаем исходное сообщение пользователя для контекста
    const originalMessage = userMessages.get(String(userId));
    
    // Отправляем голосовое сообщение пользователю
    bot.sendVoice(userId, msg.voice.file_id)
      .then(() => {
        console.log(`✅ Голосовой ответ успешно отправлен пользователю ${userId}`);
        
        // Отправляем контекст текстом, если есть исходное сообщение
        if (originalMessage) {
          const contextMessage = `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n💬 Sizning savolingiz: "${originalMessage.text}"\n⏰ Vaqt: ${originalMessage.timestamp}\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
          bot.sendMessage(userId, contextMessage);
        }
        
        // Показываем админу контекст ответа
        let adminContext = `✅ Голосовой ответ отправлен пользователю ${userId}`;
        if (originalMessage) {
          adminContext += `\n\n📝 На сообщение: "${originalMessage.text}"\n⏰ От: ${originalMessage.timestamp}`;
        }
        
        bot.sendMessage(ADMIN_ID, adminContext);
      })
      .catch((error) => {
        console.error(`❌ Ошибка отправки голосового ответа пользователю ${userId}:`, error);
        bot.sendMessage(ADMIN_ID, `❌ Ошибка отправки голосового ответа пользователю ${userId}`);
      });
    return;
  }

  // Если админ в режиме ответа (текстовый ответ)
  if (chatId === ADMIN_ID && pendingReplies.has(ADMIN_ID)) {
    const userId = pendingReplies.get(ADMIN_ID);
    pendingReplies.delete(ADMIN_ID);
    
    console.log(`Отправляем произвольный ответ пользователю ${userId}: "${text}"`);
    
    // Получаем исходное сообщение пользователя для контекста
    const originalMessage = userMessages.get(String(userId));
    console.log(`🔍 Ищем сообщение пользователя ${userId}:`, originalMessage);
    console.log(`📋 Все сохраненные сообщения:`, Array.from(userMessages.entries()));
    
    let contextMessage = '';
    if (originalMessage) {
      contextMessage = `\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n💬 Sizning savolingiz: "${originalMessage.text}"\n⏰ Vaqt: ${originalMessage.timestamp}\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
      console.log(`✅ Добавляем контекст в произвольный ответ`);
    } else {
      console.log(`❌ Исходное сообщение не найдено для пользователя ${userId}`);
    }
    
    const fullMessage = `📩 Administrator javobi:\n\n${text}${contextMessage}`;
    console.log(`Полное сообщение для отправки: "${fullMessage}"`);
    
    bot.sendMessage(userId, fullMessage)
      .then(() => {
        console.log(`✅ Произвольный ответ успешно отправлен пользователю ${userId}`);
        
        // Показываем админу контекст ответа
        let adminContext = `✅ Ответ отправлен пользователю ${userId}`;
        if (originalMessage) {
          adminContext += `\n\n📝 На сообщение: "${originalMessage.text}"\n⏰ От: ${originalMessage.timestamp}`;
        }
        
        bot.sendMessage(ADMIN_ID, adminContext);
      })
      .catch((error) => {
        console.error(`❌ Ошибка отправки произвольного ответа пользователю ${userId}:`, error);
        bot.sendMessage(ADMIN_ID, `❌ Ошибка отправки ответа пользователю ${userId}`);
      });
    return;
  }

  // Если пишет админ и начинается с /reply — отправляем ответ
  if (chatId === ADMIN_ID && text.startsWith('/reply')) {
    const parts = text.split(' ');
    const userId = parts[1];
    const replyText = parts.slice(2).join(' ');

    // Получаем исходное сообщение пользователя для контекста
    const originalMessage = userMessages.get(String(userId));
    let contextMessage = '';
    if (originalMessage) {
      contextMessage = `\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n💬 Sizning savolingiz: "${originalMessage.text}"\n⏰ Vaqt: ${originalMessage.timestamp}\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
    }

    bot.sendMessage(userId, `📩 Administrator javobi:\n\n${replyText}${contextMessage}`);
    
    // Показываем админу контекст ответа
    let adminContext = `✅ Ответ отправлен пользователю ${userId}`;
    if (originalMessage) {
      adminContext += `\n\n📝 На сообщение: "${originalMessage.text}"\n⏰ От: ${originalMessage.timestamp}`;
    }
    bot.sendMessage(ADMIN_ID, adminContext);
  } 
  else if (chatId !== ADMIN_ID) {
    console.log(`📨 Foydalanuvchidan xabar keldi ${chatId}: "${text}"`);
    
    // Обработка команды /start
    if (text === '/start') {
      bot.sendMessage(chatId, '👋 Ассалому алекум ва рохматуллохи ва барокатуху, Men administrator bilan aloqa qilish uchun botman.\n\n📝 Xabaringizni yozing, men uni administratorga yetkazaman. U sizga javob bera oladi.');
      return; // Не пересылаем /start админу
    }
    
    // Сохраняем сообщение пользователя для контекста
    const userName = msg.from.username ? `@${msg.from.username}` : 'Username yo\'q';
    const fullName = `${msg.from.first_name || ''} ${msg.from.last_name || ''}`.trim();
    const userInfo = fullName ? `${fullName} (${userName})` : userName;
    
    const messageData = {
      text: text,
      userInfo: userInfo,
      timestamp: new Date().toLocaleString('ru-RU')
    };
    
    userMessages.set(String(chatId), messageData);
    console.log(`💾 Сохранили сообщение пользователя ${chatId}:`, messageData);
    
    // Пересылаем админу сообщение пользователя с кнопками для ответа
    const keyboard = {
      inline_keyboard: [
        [
          { text: '✅ Tez javob', callback_data: `quick_reply_${chatId}` },
          { text: '📝 Javob yozish', callback_data: `write_reply_${chatId}` }
        ],
        [
          { text: '🎤 Ovozli xabar', callback_data: `voice_reply_${chatId}` },
          { text: '📋 Foydalanuvchi haqida', callback_data: `info_${chatId}` }
        ],
        [
          { text: '🚫 Bloklash', callback_data: `block_${chatId}` }
        ]
      ]
    };

    // Используем уже сохраненную информацию о пользователе

    console.log(`📤 Отправляем сообщение админу `);
    
    bot.sendMessage(ADMIN_ID, `📨 Foydalanuvchidan kelgan xabar:\n👤 ${userInfo}\n🆔 ID: ${chatId}\n\n💬 "${text}"`, {
      reply_markup: keyboard
    })
    .then(() => {
      console.log(`✅ Сообщение успешно отправлено админу`);
    })
    .catch((error) => {
      console.error(`❌ Ошибка отправки сообщения админу:`, error);
    });
    
    bot.sendMessage(chatId, '✅ Xabaringiz administratorga yuborildi. Javobni kuting.')
    .then(() => {
      console.log(`✅ Подтверждение отправлено пользователю ${chatId}`);
    })
    .catch((error) => {
      console.error(`❌ Ошибка отправки подтверждения пользователю ${chatId}:`, error);
    });
  }
});

// 🔘 Обработка нажатий на inline-кнопки
bot.on('callback_query', (callbackQuery) => {
  const message = callbackQuery.message;
  const data = callbackQuery.data;
  const adminId = callbackQuery.from.id;

  // Проверяем, что это админ
  if (adminId !== ADMIN_ID) {
    bot.answerCallbackQuery(callbackQuery.id, { text: '❌ У вас нет прав для этого действия' });
    return;
  }

  // Улучшенный парсинг callback_data
  console.log(`Получен callback_data: "${data}"`);
  let action, fullUserId, messageId;
  
  if (data.startsWith('msg_')) {
    const parts = data.split('_');
    action = parts[0];
    fullUserId = parts.slice(1, -1).join('_');
    messageId = parts[parts.length - 1];
    console.log(`Парсинг msg: action=${action}, fullUserId=${fullUserId}, messageId=${messageId}`);
  } else if (data.includes('_reply_') || data.includes('_write_') || data.includes('_quick_') || data.includes('_voice_') || data.includes('_block_') || data.includes('_info_')) {
    // Обработка составных команд типа quick_reply_, write_reply_ и т.д.
    const parts = data.split('_');
    action = parts.slice(0, 2).join('_'); // quick_reply, write_reply и т.д.
    fullUserId = parts.slice(2).join('_');
    console.log(`Парсинг составной команды: action=${action}, fullUserId=${fullUserId}`);
  } else {
    const parts = data.split('_');
    action = parts[0];
    fullUserId = parts.slice(1).join('_');
    console.log(`Парсинг простой команды: action=${action}, fullUserId=${fullUserId}`);
  }

  switch (action) {
    case 'quick':
    case 'quick_reply':
      // Быстрые ответы с короткими идентификаторами
      const quickReplies = {
        inline_keyboard: [
          [{ text: '👋 Salom! Ishlar qanday?', callback_data: `msg_${fullUserId}_1` }],
          [{ text: '✅ Murojaatingiz uchun rahmat!', callback_data: `msg_${fullUserId}_2` }],
          [{ text: '⏰ Keyinroq javob beraman', callback_data: `msg_${fullUserId}_3` }],
          [{ text: '❓ Savolni aniqlashtiring', callback_data: `msg_${fullUserId}_4` }],
          [{ text: '🔙 Orqaga', callback_data: `back_${fullUserId}` }]
        ]
      };
      
      bot.editMessageReplyMarkup(quickReplies, {
        chat_id: message.chat.id,
        message_id: message.message_id
      });
      break;

    case 'write':
    case 'write_reply':
      // Режим написания ответа
      console.log(`Включен режим ответа для пользователя: ${fullUserId}`);
      pendingReplies.set(ADMIN_ID, fullUserId);
      bot.answerCallbackQuery(callbackQuery.id, { text: '✏️ Напишите ваш ответ следующим сообщением' });
      bot.sendMessage(ADMIN_ID, `✏️ Режим ответа пользователю ${fullUserId}.\nНапишите ваше сообщение:`);
      break;

    case 'voice':
    case 'voice_reply':
      // Режим записи голосового ответа
      console.log(`Включен режим голосового ответа для пользователя: ${fullUserId}`);
      pendingReplies.set(ADMIN_ID, fullUserId);
      bot.answerCallbackQuery(callbackQuery.id, { text: '🎤 Запишите голосовое сообщение' });
      bot.sendMessage(ADMIN_ID, `🎤 Режим голосового ответа пользователю ${fullUserId}.\nЗапишите и отправьте голосовое сообщение:`);
      break;

    case 'msg':
      // Отправка быстрого ответа по ID
      console.log(`Обрабатываем быстрый ответ. messageId: ${messageId}, fullUserId: ${fullUserId}`);
      
      const quickMessages = {
        '1': 'Salom! Ishlar qanday?',
        '2': 'Murojaatingiz uchun rahmat!',
        '3': 'Xabaringizni oldim, biroz kechroq javob beraman!',
        '4': 'Savolingizni to\'liq tushunmadim. Aniqroq yoza olasizmi?'
      };
      
      const replyText = quickMessages[messageId] || `Ошибка: неизвестное сообщение с ID ${messageId}`;
      console.log(`Отправляем быстрый ответ пользователю ${fullUserId}: "${replyText}"`);
      
      // Получаем исходное сообщение пользователя для контекста
      const originalMessage = userMessages.get(String(fullUserId));
      let contextMessage = '';
      if (originalMessage) {
        contextMessage = `\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n💬 Sizning savolingiz: "${originalMessage.text}"\n⏰ Vaqt: ${originalMessage.timestamp}\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
      }
      
      bot.sendMessage(fullUserId, `📩 Administrator javobi:\n\n${replyText}${contextMessage}`)
        .then(() => {
          console.log(`✅ Быстрый ответ успешно отправлен пользователю ${fullUserId}`);
          bot.answerCallbackQuery(callbackQuery.id, { text: '✅ Ответ отправлен!' });
          
          // Показываем админу контекст ответа
          if (originalMessage) {
            bot.sendMessage(ADMIN_ID, `✅ Быстрый ответ отправлен пользователю ${fullUserId}\n\n📝 На сообщение: "${originalMessage.text}"\n⏰ От: ${originalMessage.timestamp}`);
          }
        })
        .catch((error) => {
          console.error(`❌ Ошибка отправки быстрого ответа пользователю ${fullUserId}:`, error);
          bot.answerCallbackQuery(callbackQuery.id, { text: '❌ Ошибка отправки ответа!' });
        });
      
      // Возвращаем исходные кнопки
      const originalKeyboard = {
        inline_keyboard: [
          [
            { text: '✅ Tez javob', callback_data: `quick_reply_${fullUserId}` },
            { text: '📝 Javob yozish', callback_data: `write_reply_${fullUserId}` }
          ],
          [
            { text: '🚫 Bloklash', callback_data: `block_${fullUserId}` },
            { text: '📋 Foydalanuvchi haqida', callback_data: `info_${fullUserId}` }
          ]
        ]
      };
      
      bot.editMessageReplyMarkup(originalKeyboard, {
        chat_id: message.chat.id,
        message_id: message.message_id
      });
      break;

    case 'back':
      // Возврат к исходным кнопкам
      const backKeyboard = {
        inline_keyboard: [
          [
            { text: '✅ Tez javob', callback_data: `quick_reply_${fullUserId}` },
            { text: '📝 Javob yozish', callback_data: `write_reply_${fullUserId}` }
          ],
          [
            { text: '🚫 Bloklash', callback_data: `block_${fullUserId}` },
            { text: '📋 Foydalanuvchi haqida', callback_data: `info_${fullUserId}` }
          ]
        ]
      };
      
      bot.editMessageReplyMarkup(backKeyboard, {
        chat_id: message.chat.id,
        message_id: message.message_id
      });
      bot.answerCallbackQuery(callbackQuery.id);
      break;

    case 'block':
      bot.answerCallbackQuery(callbackQuery.id, { text: '🚫 Пользователь заблокирован (функция в разработке)' });
      break;

    case 'info':
      bot.answerCallbackQuery(callbackQuery.id, { text: `📋 ID пользователя: ${fullUserId}` });
      break;

    default:
      console.log(`Неизвестная команда: ${action}, данные: ${data}`);
      bot.answerCallbackQuery(callbackQuery.id, { text: '❌ Неизвестная команда' });
      break;
  }
});

// 🚀 Запуск бота
console.log('🤖 Бот запущен и готов к работе!');
console.log(`👤 ID администратора: ${ADMIN_ID}`);

// Обработка ошибок
bot.on('error', (error) => {
  console.error('❌ Ошибка бота:', error);
});

bot.on('polling_error', (error) => {
  console.error('❌ Ошибка polling:', error);
});
