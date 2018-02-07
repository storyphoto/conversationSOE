// The ConversationPanel module is designed to handle
// all display and behaviors of the conversation column of the app.
/* eslint no-unused-vars: "off" */
/* global Api: true, Common: true*/

var ConversationPanel = (function() {
  var settings = {
    selectors: {
      chatBox: '#scrollingChat',
      fromUser: '.from-user',
      fromWatson: '.from-watson',
      latest: '.latest'
    },
    authorTypes: {
      user: 'user',
      watson: 'watson'
    }
  };

  // Publicly accessible methods defined
  return {
    init: init,
    inputKeyDown: inputKeyDown,
    sendMessageByButton : sendMessageByButton
  };

  // Initialize the module
  function init() {
    chatUpdateSetup();
    Api.sendRequest( '', null );
    setupInputBox();
  }
  // Set up callbacks on payload setters in Api module
  // This causes the displayMessage function to be called when messages are sent / received
  function chatUpdateSetup() {
    var currentRequestPayloadSetter = Api.setRequestPayload;
    Api.setRequestPayload = function(newPayloadStr) {
      currentRequestPayloadSetter.call(Api, newPayloadStr);
      displayMessage(JSON.parse(newPayloadStr), settings.authorTypes.user);
    };

    var currentResponsePayloadSetter = Api.setResponsePayload;
    Api.setResponsePayload = function(newPayloadStr) {
      currentResponsePayloadSetter.call(Api, newPayloadStr);
      displayMessage(JSON.parse(newPayloadStr), settings.authorTypes.watson);
    };
  }

// Set up the input box to underline text as it is typed
  // This is done by creating a hidden dummy version of the input box that
  // is used to determine what the width of the input text should be.
  // This value is then used to set the new width of the visible input box.
  function setupInputBox() {
    var input = document.getElementById('textInput');
    var dummy = document.getElementById('textInputDummy');
    var minFontSize = 14;
    var maxFontSize = 16;
    var minPadding = 4;
    var maxPadding = 6;

    // If no dummy input box exists, create one
    if (dummy === null) {
      var dummyJson = {
        'tagName': 'div',
        'attributes': [{
          'name': 'id',
          'value': 'textInputDummy'
        }]
      };

      dummy = Common.buildDomElement(dummyJson);
      document.body.appendChild(dummy);
    }

    function adjustInput() {
      if (input.value === '') {
        // If the input box is empty, remove the underline
        input.classList.remove('underline');
        input.setAttribute('style', 'width:' + '100%');
        input.style.width = '100%';
      } else {
        // otherwise, adjust the dummy text to match, and then set the width of
        // the visible input box to match it (thus extending the underline)
        input.classList.add('underline');
        var txtNode = document.createTextNode(input.value);
        ['font-size', 'font-style', 'font-weight', 'font-family', 'line-height',
          'text-transform', 'letter-spacing'].forEach(function(index) {
            dummy.style[index] = window.getComputedStyle(input, null).getPropertyValue(index);
          });
        dummy.textContent = txtNode.textContent;

        var padding = 0;
        var htmlElem = document.getElementsByTagName('html')[0];
        var currentFontSize = parseInt(window.getComputedStyle(htmlElem, null).getPropertyValue('font-size'), 10);
        if (currentFontSize) {
          padding = Math.floor((currentFontSize - minFontSize) / (maxFontSize - minFontSize)
            * (maxPadding - minPadding) + minPadding);
        } else {
          padding = maxPadding;
        }

        var widthValue = ( dummy.offsetWidth + padding) + 'px';
        input.setAttribute('style', 'width:' + widthValue);
        input.style.width = widthValue;
      }
    }

    // Any time the input changes, or the window resizes, adjust the size of the input box
    input.addEventListener('input', adjustInput);
    window.addEventListener('resize', adjustInput);

    // Trigger the input event once to set up the input box and dummy element
    Common.fireEvent(input, 'input');
  }

  // Display a user or Watson message that has just been sent/received
  function displayMessage(newPayload, typeValue) {
    var isUser = isUserMessage(typeValue);
    var textExists = (newPayload.input && newPayload.input.text)
      || (newPayload.output && newPayload.output.text);
    if (isUser !== null && textExists) {
      // Create new message DOM element
      var messageDivs = buildMessageDomElements(newPayload, isUser);
      var chatBoxElement = document.querySelector(settings.selectors.chatBox);
      var previousLatest = chatBoxElement.querySelectorAll((isUser
              ? settings.selectors.fromUser : settings.selectors.fromWatson)
              + settings.selectors.latest);
      // Previous "latest" message is no longer the most recent
      if (previousLatest) {
        Common.listForEach(previousLatest, function(element) {
          element.classList.remove('latest');
        });
      }

      messageDivs.forEach(function(currentDiv) {
        chatBoxElement.appendChild(currentDiv);
        // Class to start fade in animation
        currentDiv.classList.add('load');
      });
      // Move chat to the most recent messages when new messages are added
      scrollToChatBottom();
      $(".img-message").load(function() {
        //console.log(".img-message loaded");
        scrollToChatBottom();
      });
    }
  }

  // Checks if the given typeValue matches with the user "name", the Watson "name", or neither
  // Returns true if user, false if Watson, and null if neither
  // Used to keep track of whether a message was from the user or Watson
  function isUserMessage(typeValue) {
    if (typeValue === settings.authorTypes.user) {
      return true;
    } else if (typeValue === settings.authorTypes.watson) {
      return false;
    }
    return null;
  }

  function sendMessageByButton(obj)
  {
    var e = $.Event('keydown', {keyCode : 13});
    $('#textInput').val($(obj).text());
    $('#textInput').trigger(e);
  }

  // Constructs new DOM element from a message payload
  function buildMessageDomElements(newPayload, isUser) {
    var strMessage = isUser ? newPayload.input.text : newPayload.output.text;
    if (Object.prototype.toString.call( strMessage ) !== '[object Array]') {
      strMessage = [strMessage];
    }
    var messageArray = [];

    //textArray.forEach(function(currentText) {
    const msgInnerArray = [];

    if(strMessage) {
      const strMessageJson = {
        // <p>{messageText}</p>
        'tagName': 'p',
        'text': strMessage
      };
      msgInnerArray.push(strMessageJson);
    }

    if(newPayload && newPayload.hasOwnProperty('output') && newPayload.output != undefined && 
        newPayload.output.hasOwnProperty('actions') && newPayload.output.actions != undefined) {

      newPayload.output.actions.forEach(function(action) {
        if(action.type == 'sendOutput') {
          action.output.forEach(function(output) {
            if(output.type == 'text') { // 1. text 인 경우
              const textJson = {
                'tagName': 'p',
                'text': output.text
              };
              msgInnerArray.push(textJson);
            }
            else if (output.type == 'image') { // 2. image 인 경우
              const imgJson = {
                "tagName": "img",
                "classNames": ["img-message"],
                "attributes" : [
                  { "name": "src", "value": output.url }
                ]
              };
              msgInnerArray.push(imgJson);
            }
            else if (output.type == 'selection') { // 4. Selection 인 경우 (select box)
              const buttonArray = [];
              output.items.forEach(function(selectionItem) {
                var buttonObj = {
                  "tagName": "button",
                  "text": selectionItem.label,
                  "classNames": ["btn-message"],
                  "attributes": [
                    { "name": "data-action", "value" : selectionItem.value },
                    { "name": "data-value", "value" : selectionItem.label },
                    { "name": "onclick", "value" : "ConversationPanel.sendMessageByButton(this);" }
                  ]
                };
                buttonArray.push(buttonObj);
              });

              const selectionJson = {
                "tagName": "div",
                "children": buttonArray
              };
              msgInnerArray.push(selectionJson);
            }
          });

          action.output.forEach(function(output) {
            if (output.type == 'link') { // 3. link 인 경우

              const linkJson = {
                "tagName": "div",
                "children": [{
                  "tagName": "a",
                  "attributes": [
                    { "name": "href", "value": output.url },
                    { "name": "target", "value": "_blank" }
                  ],
                  "children": [
                    {
                      "tagName": "button",
                      "classNames" : ["link-btn-message"],
                      "text": "자세히 보기"
                    }
                  ]
                }]
              };
              msgInnerArray.push(linkJson);
            }
          });
        }
      });

    }

    const messageJson = {
      // <div class='segments'>
      'tagName': 'div',
      'classNames': ['segments'],
      'children': [{
        // <div class='from-user/from-watson latest'>
        'tagName': 'div',
        'classNames': [(isUser ? 'from-user' : 'from-watson'), 'latest', ((messageArray.length === 0) ? 'top' : 'sub')],
        'children': [{
          // <div class='message-inner'>
          'tagName': 'div',
          'classNames': ['message-inner'],
          'children': msgInnerArray
        }]
      }]
    };

    messageArray.push(Common.buildDomElement(messageJson));
    //}

    return messageArray;
  }

  // Scroll to the bottom of the chat window (to the most recent messages)
  // Note: this method will bring the most recent user message into view,
  //   even if the most recent message is from Watson.
  //   This is done so that the "context" of the conversation is maintained in the view,
  //   even if the Watson message is long.
  function scrollToChatBottom() {
    var scrollingChat = document.querySelector('#scrollingChat');

    // Scroll to the latest message sent by the user
    var scrollEl = scrollingChat.querySelector(settings.selectors.fromUser
            + settings.selectors.latest);
                
    if (scrollEl) {
      //scrollingChat.scrollTop = scrollEl.offsetTop;      
      scrollingChat.scrollTop = scrollingChat.scrollHeight;
    }

    $('#textInput').focus();
  }

  // Handles the submission of input
  function inputKeyDown(event, inputBox) {
    // Submit on enter key, dis-allowing blank messages
    if (event.keyCode === 13 && inputBox.value) {
      // Retrieve the context from the previous server response
      var context;
      var latestResponse = Api.getResponsePayload();
      if (latestResponse) {
        context = latestResponse.context;
      }

      // API 호출 전 Context 셋팅 작업 
      if (latestResponse && latestResponse.hasOwnProperty('output') && latestResponse.output != undefined &&
          latestResponse.output.hasOwnProperty('actions') && latestResponse.output.actions != undefined) {
        
        // 서버에서 return된 action 중 sendMessage에 있는 context를 추출
        var appendContext;
        for (var i = 0; i < latestResponse.output.actions.length; i++) {
          if (latestResponse.output.actions[i].hasOwnProperty('type') && latestResponse.output.actions[i].type == 'sendMessage')
            appendContext = latestResponse.output.actions[i];
        }

        // client에서 셋팅 해야하는 context 키 값을 실제 사용자가 입력한 값과 대조하여 실제 value로 변경
        var strAppendContext;
        if (appendContext != undefined && appendContext.hasOwnProperty('context'))
        {
          var contextValue = $(".from-watson.latest button[data-value='" + inputBox.value + "']").first().data('action');
          strAppendContext = JSON.stringify(appendContext.context).replace('<%= _selection.value %>', contextValue == undefined ? null : contextValue);
          
        }

        // 기존 context 와 병합
        if (context == undefined && strAppendContext != undefined)
          context = strAppendContext;
        else if (context != undefined && strAppendContext != undefined)
          context = $.extend(context, JSON.parse(strAppendContext))
      }
    

      // Send the user message
      Api.sendRequest(inputBox.value, context);

      // Clear input box for further messages
      inputBox.value = '';
      Common.fireEvent(inputBox, 'input');
    }
  }
}());
