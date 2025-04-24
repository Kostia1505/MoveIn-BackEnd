const Message = require('../models/message');
const User = require('../models/user');
const Listing = require('../models/listing');
const { Op } = require('sequelize');

// Відправити повідомлення
exports.sendMessage = async (req, res) => {
  try {
    const { content, receiverId, listingId } = req.body;
    const senderId = req.user.id;

    // Перевірка, чи існує оголошення
    const listing = await Listing.findByPk(listingId);
    if (!listing) {
      return res.status(404).json({ error: 'Оголошення не знайдено' });
    }

    // Перевірка, чи існує отримувач
    const receiver = await User.findByPk(receiverId);
    if (!receiver) {
      return res.status(404).json({ error: 'Отримувача не знайдено' });
    }

    // Перевірка, що користувач не надсилає повідомлення самому собі
    if (senderId === receiverId) {
      return res.status(400).json({ error: 'Ви не можете написати повідомлення самому собі' });
    }

    const message = await Message.create({
      content,
      senderId,
      receiverId,
      listingId,
      read: false
    });

    res.status(201).json(message);
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Помилка при відправленні повідомлення' });
  }
};

// Отримати всі чати користувача
exports.getConversations = async (req, res) => {
  try {
    const userId = req.user.id;

    // Знаходимо всі унікальні розмови, де користувач є відправником або отримувачем
    const sentMessages = await Message.findAll({
      where: { senderId: userId },
      attributes: ['receiverId', 'listingId'],
      group: ['receiverId', 'listingId']
    });

    const receivedMessages = await Message.findAll({
      where: { receiverId: userId },
      attributes: ['senderId', 'listingId'],
      group: ['senderId', 'listingId']
    });

    // Об'єднуємо результати
    const conversations = [];
    
    for (const msg of sentMessages) {
      const otherUser = await User.findByPk(msg.receiverId, {
        attributes: ['id', 'username', 'avatar']
      });
      
      const listing = await Listing.findByPk(msg.listingId, {
        attributes: ['id', 'title']
      });
      
      const unreadCount = await Message.count({
        where: {
          senderId: msg.receiverId,
          receiverId: userId,
          listingId: msg.listingId,
          read: false
        }
      });
      
      conversations.push({
        user: otherUser,
        listing,
        unreadCount
      });
    }
    
    for (const msg of receivedMessages) {
      // Перевіряємо чи цей контакт вже є в списку
      const existingIndex = conversations.findIndex(
        c => c.user.id === msg.senderId && c.listing.id === msg.listingId
      );
      
      if (existingIndex === -1) {
        const otherUser = await User.findByPk(msg.senderId, {
          attributes: ['id', 'username', 'avatar']
        });
        
        const listing = await Listing.findByPk(msg.listingId, {
          attributes: ['id', 'title']
        });
        
        const unreadCount = await Message.count({
          where: {
            senderId: msg.senderId,
            receiverId: userId,
            listingId: msg.listingId,
            read: false
          }
        });
        
        conversations.push({
          user: otherUser,
          listing,
          unreadCount
        });
      }
    }

    res.json(conversations);
  } catch (error) {
    console.error('Error getting conversations:', error);
    res.status(500).json({ error: 'Помилка при отриманні чатів' });
  }
};

// Отримати повідомлення конкретного чату
exports.getMessages = async (req, res) => {
  try {
    const userId = req.user.id;
    const { otherUserId, listingId } = req.params;

    const messages = await Message.findAll({
      where: {
        listingId,
        [Op.or]: [
          { senderId: userId, receiverId: otherUserId },
          { senderId: otherUserId, receiverId: userId }
        ]
      },
      order: [['createdAt', 'ASC']],
      include: [
        { model: User, as: 'sender', attributes: ['id', 'username', 'avatar'] },
        { model: User, as: 'receiver', attributes: ['id', 'username', 'avatar'] },
        { model: Listing, attributes: ['id', 'title'] }
      ]
    });

    // Позначаємо всі повідомлення як прочитані
    await Message.update(
      { read: true },
      { 
        where: {
          receiverId: userId,
          senderId: otherUserId,
          listingId,
          read: false
        }
      }
    );

    res.json(messages);
  } catch (error) {
    console.error('Error getting messages:', error);
    res.status(500).json({ error: 'Помилка при отриманні повідомлень' });
  }
};

// Позначити повідомлення як прочитане
exports.markAsRead = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.id;

    const message = await Message.findByPk(messageId);
    
    if (!message) {
      return res.status(404).json({ error: 'Повідомлення не знайдено' });
    }
    
    // Перевірка що користувач є отримувачем цього повідомлення
    if (message.receiverId !== userId) {
      return res.status(403).json({ error: 'Доступ заборонено' });
    }

    message.read = true;
    await message.save();

    res.json({ success: true });
  } catch (error) {
    console.error('Error marking message as read:', error);
    res.status(500).json({ error: 'Помилка при оновленні статусу повідомлення' });
  }
};

// Отримати кількість непрочитаних повідомлень
exports.getUnreadCount = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const count = await Message.count({
      where: {
        receiverId: userId,
        read: false
      }
    });
    
    res.json({ unreadCount: count });
  } catch (error) {
    console.error('Error getting unread count:', error);
    res.status(500).json({ error: 'Помилка при отриманні кількості непрочитаних повідомлень' });
  }
};