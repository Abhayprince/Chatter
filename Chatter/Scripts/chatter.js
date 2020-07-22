$(function () {

    const welcomeModal = $('#welcome-modal');
    const userNameTxt = $('#user-name-txt')

    welcomeModal.modal('show');
    userNameTxt.focus();

    const userNameHdn = $('#current-user-name-hdn');

    const userNamesDb = 'userNames';
    const messagesDb = 'messages';

    const currentUserIdHdn = $('#current-userid');
    const searchUserTxt = $('#user-search-box');
    const searchUserBtn = $('#user-search-btn');
    const usersListUl = $('#users-list');
    const selectedChatHeader = $('#selected-user-header-name');
    const chatsList = $('#chats-list');
    const chatsWrapper = $('.chats-wrapper');
    const sendChatTxt = $('#send-message-box');
    const sendChatBtn = $('#send-message-btn');

    const currentUserName = () => userNameHdn.val();
    const currentUserId = () => currentUserIdHdn.val();

    const getInitial = (name) => {
        const parts = name.split(/[\s\-_\.]/g);
        if (parts.length > 1) {
            return `${parts[0][0].toUpperCase()}${parts[1][0].toUpperCase()}`;
        }
        return name.substr(0, 2).toUpperCase();
    }

    if (!sessionStorage[userNamesDb]) {
        sessionStorage[userNamesDb] = JSON.stringify({});
    }
    if (!sessionStorage[messagesDb]) {
        sessionStorage[messagesDb] = JSON.stringify([]);
    }

    getMessagesFromStorage = (userId) => {
        const allMessages = JSON.parse(sessionStorage[messagesDb]);
        if (allMessages && allMessages.length) {
            const myUserId = currentUserId();
            return allMessages.filter(m => m.To.UserId === userId || (m.To.UserId === myUserId && m.From.UserId === userId)) || [];
        }
        return [];
    }

    getBroadcastMessagesFromStorage = () => {
        const allMessages = JSON.parse(sessionStorage[messagesDb]);
        if (allMessages && allMessages.length) {
            const myUserId = currentUserId();
            return allMessages.filter(m => m.IsBroadcast && m.From.UserId === myUserId) || [];
        }
        return [];
    }

    saveUsersToStorage = (users) => {
        sessionStorage[userNamesDb] = JSON.stringify(users);
    }

    getUserNameById = (userId) => JSON.parse(sessionStorage[userNamesDb])[userId] || '';

    saveMessageToStorage = (fromUserId, message, toUserId, isBroadcasted = false) => {
        let messages = JSON.parse(sessionStorage[messagesDb] || []);
        messages.push({
            'From': {
                'UserId': fromUserId,
                'Name': getUserNameById(fromUserId)
            },
            'To': {
                'UserId': toUserId !== 'broadcast' ? toUserId : '',
                'Name': toUserId !== 'broadcast' ? getUserNameById(toUserId) : ''
            },
            'Msg': message,
            'IsBroadcast': isBroadcasted,
            'dt': getFormattedDT()
        });
        sessionStorage[messagesDb] = JSON.stringify(messages);
    }

    getFormattedDT = dt => {
        dt = dt || new Date();

        let date = dt.getDate();
        date = date < 10 ? '0' + date : date;
        let month = dt.getMonth() + 1;
        month = month < 10 ? '0' + month : month;
        const year = dt.getFullYear();
        let hours = dt.getHours() || 12; // 0AM->12AM
        const ampm = dt.getHours() > 11 ? 'PM' : 'AM';
        hours = hours < 10 ? '0' + hours : hours;
        let minutes = dt.getMinutes();
        minutes = minutes < 10 ? '0' + minutes : minutes;
        let seconds = dt.getSeconds();
        seconds = seconds < 10 ? '0' + seconds : seconds;

        return `${date}-${month}-${year} ${hours}:${minutes}:${seconds} ${ampm}`;
    }

    setUsersList = (users) => {
        $('li:not(#user-li-broadcast)', usersListUl).remove();
        if (users) {
            const myName = currentUserName();
            console.log('users : ', users)
            if (users) {
                saveUsersToStorage(users);
                let liArray = Object.keys(users).map(userid => {
                    if (users[userid] !== myName)
                        return getUserLi(userid, users[userid])
                });
                console.log('liArray : ', liArray)
                if (liArray) {
                    usersListUl.append(liArray.join(''));
                }
            }
        }
    }

    getOtherChatHtml = (initial, name, msg, dt) => {
        dt = dt || getFormattedDT();
        return `
        <li class="chat-other">
            <div class="single-chat">
                <label class="chat-by" title="${name}">${initial}</label>
                <div class="chat-content">
                    <div class="chat-bubble">
                        <p>${msg}</p>
                    </div>
                    <span class="chat-timestamp text-primary">
                        <span class="glyphicon glyphicon-time"></span>
                        ${dt}
                    </span>
                </div>
            </div>
        </li>`;
    }

    getMyChatHtml = (msg, dt) => {
        dt = dt || getFormattedDT();
        return `
        <li class="chat-my">
            <div class="single-chat">
                <div class="chat-content">
                    <div class="chat-bubble">
                        <p>${msg}</p>
                    </div>
                    <span class="chat-timestamp text-warning">
                        <span class="glyphicon glyphicon-time"></span>
                        ${dt}
                    </span>
                </div>
            </div>
        </li>`;
    }

    getSelectedChatHeaderHtml = (name, initial) => {
        return `
        <span>
            <label class="user-initials-label">${initial || getInitial(name)}</label>
            <label class="user-name-label">${name}</label>
        </span>`
    }

    getUserLi = (userid, name) => {
        name = name || 'Anonymouse';
        return `<li title="${name}" data-userid="${userid}" class="user-li-btn">
            <label class="user-initials-label pull-left">${getInitial(name)}</label>
            <label class="user-name-label">${name}</label>
        </li>`;
    }

    startChat = () => {
        const name = userNameTxt.val();
        if (name && name.replace(/\s{2,}/g, ' ').trim()) {
            userNameHdn.val(name);
            welcomeModal.modal('hide');
            $('#chat-page-container').removeClass('hide');
            selectedChatHeader.html(getSelectedChatHeaderHtml(name))
            initiateChatter(name);
            return;
        }
        alert('Please enter your name');
        userNameTxt.focus();
    }

    $('#start-chat-btn').click((e) => startChat())

    userNameTxt.keydown((e) => {
        if (e.keyCode == 13)
            startChat();
    });

    setMessagesToList = messages => {
        if (messages) {
            const myUserId = currentUserId();
            messages.forEach(m => {
                let msgHtml = null;
                if (m.From.UserId === myUserId)
                    msgHtml = getMyChatHtml(m.Msg,m.dt);
                else
                    msgHtml = getOtherChatHtml(getInitial(m.From.Name), m.From.Name, m.Msg,m.dt);

                if (msgHtml)
                    addMessageToChat(msgHtml);
            })
        }
    }

    $(document).on('click', '.user-li-btn', function (e) {
        const li = $(this);
        const userId = li.data('userid');
        const name = li.attr('title');

        sendChatBtn.data('send-to-id', userId);
        chatsList.empty();
        let existingMessages = [];
        if (userId === 'broadcast') {
            selectedChatHeader.html(getSelectedChatHeaderHtml(name, 'BR'))
            existingMessages=getBroadcastMessagesFromStorage();
        }
        else {
            selectedChatHeader.html(getSelectedChatHeaderHtml(name))
            existingMessages = getMessagesFromStorage(userId);
        }
        if (existingMessages && existingMessages.length) {
            setMessagesToList(existingMessages);
        }
        sendChatTxt.addClass('animated bounceInDown');
        sendChatTxt.focus();
    });

    applyUserSearch = () => {
        let q = searchUserTxt.val();        
        if (q)
            q = q.replace(/\s{2,}/g, ' ').trim();
        if (q) {
            q = q.toLowerCase();
            $('li', usersListUl).each(function (index,el) {
                li = $(this);
                let name = li.attr('title');
                if (name) {
                    name = name.toLowerCase();
                    if (name.indexOf(q) > -1 || name.indexOf(' ' + q)>-1 || name.indexOf('-' + q)>-1)
                        li.show();
                    else
                        li.hide();
                }
            });
        }
        else
            $('li', usersListUl).show();
    }
    searchUserBtn.click((e) => {        
        applyUserSearch();
    });

    searchUserTxt.keyup((e) => {
            applyUserSearch();
    });
    sendChatTxt.keydown((e) => {
        console.log('KEYDOWN')
        if (e.keyCode == 13)
            sendChatBtn.trigger('click');
    });

    addMessageToChat = msgHtml => {
        chatsList.append(msgHtml);
        chatsWrapper.animate({ scrollTop: chatsWrapper[0].scrollHeight }, 'slow')
    }

    function initiateChatter(name) {
        const userName = name;
        const chat = $.connection.chatterHub;

        chat.client.receiveUserId = userId => {
            currentUserIdHdn.val(userId);
        }

        chat.client.receiveConnectedUsers = usersList => {
            console.log('usersList : ', usersList);
            setUsersList(usersList);
        }

        chat.client.receiveMessage = (fromUserId, fromName, msg,isBroadcasted) => {
            fromName = fromName || 'Anonymous';
            let msgHtml = getOtherChatHtml(getInitial(fromName), fromName, msg);
            addMessageToChat(msgHtml);
            saveMessageToStorage(fromUserId, msg, currentUserId(), isBroadcasted)
        }

        $.connection.hub.start().done(() => {

            chat.server.hello(userName);

            sendChatBtn.click(function (e) {
                const msg = sendChatTxt.val();
                if (msg) {
                    const toUserId = sendChatBtn.data('send-to-id');
                    console.log('toUserId : ', toUserId)
                    if (toUserId === 'broadcast')
                        chat.server.broadcast(msg)
                    else
                        chat.server.send(toUserId, msg);

                    addMessageToChat(getMyChatHtml(msg))
                    sendChatTxt.val('');
                    sendChatTxt.focus();

                    saveMessageToStorage(currentUserId(), msg, toUserId, toUserId === 'broadcast')
                }
            });
        });
    }
});
