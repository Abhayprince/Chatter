$(function () {

    const welcomeModal = $('#welcome-modal');
    welcomeModal.modal('show');

    const userNameTxt = $('#user-name-txt')

    const userNameHdn = $('#current-user-name-hdn');

    const userNamesDb = 'userNames';
    const messagesDb = 'messages';

    const searchUserTxt = $('#user-search-box');
    const searchUserBtn = $('#user-search-btn');
    const usersListUl = $('#users-list');
    const selectedChatHeader = $('#selected-user-header-name');
    const chatsList = $('#chats-list');
    const sendChatTxt = $('#send-message-box');
    const sendChatBtn = $('#send-message-btn');

    const currentUserName = () => userNameHdn.val();

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
            return allMessages.filter(m => m.userId === userId) || [];
        }
        return [];
    }

    saveUsersToStorage = (users) => {
        sessionStorage[userNamesDb] = JSON.stringify(users);
    }

    const getUserNameById = (userId) => JSON.parse(sessionStorage[userNamesDb])[userId] || '';

    saveMessageToStorage = (fromUserId, message, toUserId, isBroadcasted = false) => {
        let messages = JSON.parse(sessionStorage[messagesDb] || []);
        messages.push({
            'From': {
                'UserId': fromUserId,
                'Name': getUserName(fromUserId)
            },
            'To': {
                'UserId': toUserId,
                'Name': getUserName(toUserId)
            },
            'Msg': message,
            'IsBroadcast': isBroadcasted,
            'dt': getFormattedDT()
        });
        sessionStorage[messagesDb] = JSON.stringify(messages);
    }

    const getFormattedDT = dt => {
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
        $('li:not(#user-li-broadcast)', usersListUl).empty();
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

    getSelectedChatHeaderHtml = (name) => {
        return `
        <span>
            <label class="user-initials-label">${getInitial(name)}</label>
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

    $('#start-chat-btn').click(function (e) {
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
    })

    $(document).on('click', '.user-li-btn', function (e) {
        const li = $(this);
        const userId = li.data('userid');
        const name = li.attr('title');

        sendChatBtn.data('send-to-id', userId);
        selectedChatHeader.html(getSelectedChatHeaderHtml(name))
    });

    ////////////////////////////

    function initiateChatter(name) {
        const userName = name;
        const chat = $.connection.chatterHub;

        chat.client.receiveConnectedUsers = usersList => {
            console.log('usersList : ', usersList);
            setUsersList(usersList);
        }

        $.connection.hub.start().done(function () {

            chat.server.hello(userName);

            $('#sendmessage').click(function () {
                //// Call the Send method on the hub.
                //chat.server.send($('#displayname').val(), $('#message').val());
                //// Clear text box and reset focus for next comment.

                const selectedUserId = $('#selected-userid').val();
                const msg = $('#message').val();
                if (selectedUserId) {
                    chat.server.send(selectedUserId, msg)
                }
                else {
                    chat.server.broadcast(msg);
                }
                $('#discussions').append('<li><strong>Me</strong>: ' + htmlEncode(msg) + '</li>');
                $('#message').val('').focus();
            });
        });
    }






    /////////////////////////////////////

    $(document).on('click', '.user-link', function (e) {
        const userName = $('#selected-user-name');
        const btn = $(this);
        userName.text(btn.data('name') || 'Messages');
        $('#selected-userid').val(btn.data('userid') || '');
    });
    // This optional function html-encodes messages for display in the page.
    htmlEncode = (value) => {
        var encodedValue = $('<div />').text(value).html();
        return encodedValue;
    }
    // Reference the auto-generated proxy for the hub.
    var chat = $.connection.chatterHub;
    // Create a function that the hub can call back to display messages.
    chat.client.send = function (name, message) {
        // Add the message to the page.
        $('#discussions').append('<li><strong>' + htmlEncode(name)
            + '</strong>: ' + htmlEncode(message) + '</li>');
    };
    chat.client.hello = (msg) => {
        console.log(`Message from server : ${msg}`)
    }
    chat.client.broadcast = (name, msg) => {
        $('#discussions').append('<li><strong>' + htmlEncode(name)
            + '</strong>: ' + htmlEncode(msg) + '</li>');
        //saveMessageToStorage(fromUserId, message, toUserId, isBroadcasted = false)
    }

    chat.client.usersList = users => {
        console.log('usersList : ', users);
        setUsersList(users);
    }

    // Get the user name and store it to prepend to messages.
    //$('#displayname').val(prompt('Enter your name:', ''));
    $('#display-name').text(`${$('#displayname').val()} (Me)`);
    // Set initial focus to message input box.
    $('#message').focus();
    // Start the connection.
    $.connection.hub.start().done(function () {
        chat.server.hello($('#displayname').val());
        $('#sendmessage').click(function () {
            //// Call the Send method on the hub.
            //chat.server.send($('#displayname').val(), $('#message').val());
            //// Clear text box and reset focus for next comment.

            const selectedUserId = $('#selected-userid').val();
            const msg = $('#message').val();
            if (selectedUserId) {
                chat.server.send(selectedUserId, msg)
            }
            else {
                chat.server.broadcast(msg);
            }
            $('#discussions').append('<li><strong>Me</strong>: ' + htmlEncode(msg) + '</li>');
            $('#message').val('').focus();
        });
    });
    $('#send-message-btn').click(function (e) {
        //let msgHtml = getMyChatHtml($('#send-message-box').val(), new Date());
        let msgHtml = getOtherChatHtml('PK', 'Puneet Kumar', $('#send-message-box').val(), new Date());
        $('#chats-list').append(msgHtml);
        $('.chats-wrapper').animate({ scrollTop: $('.chats-wrapper')[0].scrollHeight }, 'slow')
    })
});
