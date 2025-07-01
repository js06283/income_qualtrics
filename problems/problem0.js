// Problem 0 - Essential JavaScript
document.addEventListener("DOMContentLoaded", function () {
	// Configuration
	const assistantId = "asst_EIzTKoQGOwC0Oy8Vve2QoYmz";
	const PROXY_URL = "https://openai-proxy-iota-nine.vercel.app/openai-proxy";

	// Problem 0 data
	const problem0Data = {
		dict: '{"Age": 39, "Class of Worker": "Private", "Educational Attainment": "Bachelors", "Marital Status": "Never-married", "Occupation": "Adm-clerical", "Place of Birth": "United-States", "Usual Hours Worked per Week": 40, "Sex": "Male", "Race": "White"}',
		summary:
			"This person is a 39-year-old never-married white male with a Bachelor's degree working in administrative/clerical occupation for a private company. They work 40 hours per week and were born in the United States.",
		outcome: false,
	};

	// Original question pool
	const originalQuestionPool = [
		"What factors suggest this person might earn above 50k?",
		"What factors suggest this person might earn below 50k?",
		"How does their education level affect income potential?",
		"What role does their occupation play in income determination?",
		"How might their age influence their earning capacity?",
		"What impact does their work hours have on income?",
		"How does their marital status relate to income?",
		"What effect might their place of birth have on earnings?",
		"How does their class of worker affect income potential?",
		"What role does gender play in income determination?",
		"How might their race influence earning opportunities?",
		"What are the strongest indicators of high income for this person?",
		"What are the biggest barriers to high income for this person?",
		"How does their occupation compare to others in terms of pay?",
		"How do their work hours compare to typical full-time employment?",
		"What demographic factors work in their favor?",
		"What demographic factors work against them?",
		"How does their background compare to high earners?",
		"What career path would likely lead to higher income?",
		"What industry trends might impact their income potential?",
		"How does their current situation compare to the average worker?",
		"What skills might they need to increase their income?",
		"How might their location affect their earning potential?",
		"What are the most important factors for income prediction?",
	];

	// Global variables
	let threadId = null;
	let usedQuestions = new Set();

	// Initialize the interface
	function initializeInterface() {
		updateTable();
		updateSummary();
		updateMLPrediction();
		createChatInterface();
	}

	// Update the data table
	function updateTable() {
		const table = document.getElementById("table");
		const tbody = table.querySelector("tbody");

		// Clear existing rows except header
		const headerRow = tbody.querySelector("tr");
		tbody.innerHTML = "";
		tbody.appendChild(headerRow);

		const dataDict = JSON.parse(problem0Data.dict);
		const fieldMappings = {
			Age: "Age",
			"Class of Worker": "Class of Worker",
			"Educational Attainment": "Educational Attainment",
			"Marital Status": "Marital Status",
			Occupation: "Occupation",
			"Place of Birth": "Place of Birth",
			"Usual Hours Worked per Week": "Usual Hours Worked per week",
			Sex: "Sex",
			Race: "Race",
		};

		// Add data rows
		Object.keys(fieldMappings).forEach((key) => {
			if (dataDict[key] !== undefined) {
				const row = document.createElement("tr");
				const labelCell = document.createElement("td");
				const valueCell = document.createElement("td");

				labelCell.textContent = fieldMappings[key];
				valueCell.textContent = dataDict[key];

				row.appendChild(labelCell);
				row.appendChild(valueCell);
				tbody.appendChild(row);
			}
		});
	}

	// Update the LLM summary
	function updateSummary() {
		const summaryElement = document.querySelector(
			"#llm-summary .income-predictor-summary-content"
		);
		if (summaryElement) {
			summaryElement.textContent = problem0Data.summary;
		}
	}

	// Update the ML prediction
	function updateMLPrediction() {
		const predictionElement = document.querySelector(
			"#ml-prediction .income-predictor-summary-content"
		);
		if (predictionElement) {
			predictionElement.innerHTML =
				"The logistic model is <b>unsure</b> about this person's income and cannot provide a definitive answer.";
		}
	}

	// Create chat interface
	function createChatInterface() {
		// Create and style the chat container
		const chatContainer = document.createElement("div");
		chatContainer.id = "chat-container";
		chatContainer.style.cssText = `
            height: 350px;
            overflow-y: scroll;
            border: 1px solid #e0e0e0;
            border-radius: 12px;
            padding: 20px;
            background-color: #ffffff;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            margin-bottom: 15px;
            width: 100%;
        `;

		// Add small message at the top of the chat container
		const chatMessage = document.createElement("div");
		chatMessage.textContent =
			"Chat with AI to understand more about this person's income potential";
		chatMessage.style.cssText = `
            font-size: 12px;
            color: #666;
            font-style: italic;
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 1px solid #f0f0f0;
            text-align: center;
        `;
		chatContainer.appendChild(chatMessage);

		// Create input container
		const inputContainer = document.createElement("div");
		inputContainer.style.cssText = `
            display: flex;
            gap: 10px;
            width: 100%;
            box-sizing: border-box;
        `;

		// Create input box
		const inputBox = document.createElement("input");
		inputBox.type = "text";
		inputBox.id = "user-input";
		inputBox.placeholder = "Type here...";
		inputBox.style.cssText = `
            width: 100%;
            padding: 12px 15px;
            border-radius: 8px;
            border: 2px solid #e0e0e0;
            font-size: 14px;
            transition: border-color 0.3s ease;
            outline: none;
            box-sizing: border-box;
        `;

		// Add focus effect
		inputBox.addEventListener("focus", function () {
			this.style.borderColor = "#2196F3";
		});
		inputBox.addEventListener("blur", function () {
			this.style.borderColor = "#e0e0e0";
		});

		// Allow sending message by pressing Enter
		inputBox.addEventListener("keypress", function (event) {
			if (event.key === "Enter") {
				event.preventDefault();
				sendMessage();
			}
		});

		// Create send button
		const sendButton = document.createElement("button");
		sendButton.textContent = "Send";
		sendButton.onclick = sendMessage;
		sendButton.style.cssText = `
            padding: 12px 20px;
            background-color: #2196F3;
            color: white;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 600;
            transition: background-color 0.3s ease;
            white-space: nowrap;
            flex-shrink: 0;
        `;

		// Add hover effect for send button
		sendButton.addEventListener("mouseover", function () {
			this.style.backgroundColor = "#1976D2";
		});
		sendButton.addEventListener("mouseout", function () {
			this.style.backgroundColor = "#2196F3";
		});

		inputContainer.appendChild(inputBox);
		inputContainer.appendChild(sendButton);

		// Create quick questions container
		const quickQuestionsContainer = document.createElement("div");
		quickQuestionsContainer.className = "quick-questions-container";
		quickQuestionsContainer.style.cssText = `
            display: flex;
            flex-direction: column;
            gap: 10px;
            margin-top: 15px;
            width: 100%;
        `;

		// Add initial questions
		const initialQuestions = getRandomQuestions(3);
		initialQuestions.forEach((question) => {
			const questionButton = createQuestionButton(question);
			quickQuestionsContainer.appendChild(questionButton);
		});

		// Create refresh button container
		const refreshContainer = document.createElement("div");
		refreshContainer.style.cssText = `
            display: flex;
            justify-content: center;
            margin-top: 10px;
        `;

		const refreshButton = document.createElement("button");
		refreshButton.textContent = "Refresh";
		refreshButton.style.cssText = `
            padding: 4px 8px;
            background: #f5f5f5;
            border: 1px solid #e0e0e0;
            border-radius: 4px;
            cursor: pointer;
            font-size: 11px;
            color: #666;
            transition: all 0.2s ease;
        `;

		refreshButton.addEventListener("mouseover", function () {
			this.style.background = "#e3f2fd";
			this.style.borderColor = "#2196f3";
			this.style.color = "#2196f3";
		});
		refreshButton.addEventListener("mouseout", function () {
			this.style.background = "#f5f5f5";
			this.style.borderColor = "#e0e0e0";
			this.style.color = "#666";
		});

		refreshButton.addEventListener("click", function () {
			refreshQuestions();
		});

		refreshContainer.appendChild(refreshButton);
		quickQuestionsContainer.appendChild(refreshContainer);

		// Add to the right panel
		const rightPanel = document.getElementById("right-panel");
		rightPanel.appendChild(chatContainer);
		rightPanel.appendChild(inputContainer);
		rightPanel.appendChild(quickQuestionsContainer);
	}

	// Get random questions
	function getRandomQuestions(count = 3) {
		const availableQuestions = originalQuestionPool.filter(
			(q) => !usedQuestions.has(q)
		);

		if (availableQuestions.length < count) {
			usedQuestions.clear();
			return getRandomQuestions(count);
		}

		const selected = [];
		for (let i = 0; i < count; i++) {
			const randomIndex = Math.floor(Math.random() * availableQuestions.length);
			const question = availableQuestions.splice(randomIndex, 1)[0];
			selected.push(question);
			usedQuestions.add(question);
		}

		return selected;
	}

	// Create question button
	function createQuestionButton(question) {
		const questionButton = document.createElement("button");
		questionButton.textContent = question;
		questionButton.style.cssText = `
            flex: 1;
            padding: 8px 8px;
            background-color: #ffffff;
            border: 1px solid #e0e0e0;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            color: #1976D2;
            text-align: center;
            transition: all 0.2s ease;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        `;

		questionButton.addEventListener("mouseover", function () {
			this.style.backgroundColor = "#E3F2FD";
			this.style.borderColor = "#2196F3";
		});
		questionButton.addEventListener("mouseout", function () {
			this.style.backgroundColor = "#ffffff";
			this.style.borderColor = "#e0e0e0";
		});

		questionButton.addEventListener("click", function () {
			const inputBox = document.getElementById("user-input");
			if (inputBox) {
				inputBox.value = this.textContent;
				sendMessage();
				replaceQuestionButton(this);
			}
		});

		return questionButton;
	}

	// Replace question button
	function replaceQuestionButton(oldButton) {
		const newQuestions = getRandomQuestions(1);
		if (newQuestions.length > 0) {
			const newButton = createQuestionButton(newQuestions[0]);
			oldButton.parentNode.replaceChild(newButton, oldButton);
		}
	}

	// Refresh questions
	function refreshQuestions() {
		const quickQuestionsContainer = document.querySelector(
			".quick-questions-container"
		);
		if (quickQuestionsContainer) {
			const refreshContainer =
				quickQuestionsContainer.querySelector("div:last-child");
			quickQuestionsContainer.innerHTML = "";

			const newQuestions = getRandomQuestions(3);
			newQuestions.forEach((question) => {
				const questionButton = createQuestionButton(question);
				quickQuestionsContainer.appendChild(questionButton);
			});

			if (refreshContainer) {
				quickQuestionsContainer.appendChild(refreshContainer);
			}
		}
	}

	// Send message
	function sendMessage() {
		const inputBox = document.getElementById("user-input");
		if (!inputBox) return;

		const userInput = inputBox.value;
		if (!userInput) return;

		displayMessage("User: " + userInput, "user-message");
		inputBox.value = "";

		if (!threadId) {
			const dataDict = JSON.parse(problem0Data.dict);
			const initialMessage = `This is the individual we are making a decision on whether they earn more than 50k or not: ${JSON.stringify(
				dataDict
			)}`;

			fetch(PROXY_URL, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					path: "/threads",
					method: "POST",
					body: {
						messages: [{ role: "user", content: initialMessage }],
					},
				}),
			})
				.then((response) => response.json())
				.then((data) => {
					threadId = data.id;
					return sendMessageToThread(userInput, threadId);
				})
				.catch((error) => console.error("Error creating thread:", error));
		} else {
			sendMessageToThread(userInput, threadId);
		}
	}

	// Send message to thread
	function sendMessageToThread(userInput, threadId) {
		fetch(PROXY_URL, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				path: "/threads/" + threadId + "/messages",
				method: "POST",
				body: { role: "user", content: userInput },
			}),
		})
			.then((response) => response.json())
			.then(() => {
				return fetch(PROXY_URL, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						path: "/threads/" + threadId + "/runs",
						method: "POST",
						body: { assistant_id: assistantId, tool_choice: "required" },
					}),
				});
			})
			.then((response) => response.json())
			.then((data) => {
				if (data.id) {
					checkRunStatus(data.id, threadId);
				}
			})
			.catch((error) => console.error("Error sending message:", error));
	}

	// Check run status
	function checkRunStatus(runId, threadId) {
		fetch(PROXY_URL, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				path: "/threads/" + threadId + "/runs/" + runId,
				method: "GET",
			}),
		})
			.then((response) => response.json())
			.then((data) => {
				if (data.status === "completed") {
					getMessages();
				} else if (data.status === "failed" || data.status === "expired") {
					removeLoadingIndicator();
					displayMessage(
						"Assistant: Sorry, there was an error processing your request.",
						"assistant-message"
					);
				} else {
					setTimeout(() => checkRunStatus(runId, threadId), 1000);
				}
			})
			.catch((error) => {
				removeLoadingIndicator();
				console.error("Error checking run status:", error);
				displayMessage(
					"Assistant: Sorry, there was an error checking the response status.",
					"assistant-message"
				);
			});
	}

	// Remove loading indicator
	function removeLoadingIndicator() {
		const loadingEl = document.getElementById("loading-indicator");
		if (loadingEl) {
			loadingEl.remove();
		}
	}

	// Get messages
	function getMessages() {
		fetch(PROXY_URL, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				path: "/threads/" + threadId + "/messages",
				method: "GET",
			}),
		})
			.then((response) => response.json())
			.then((data) => {
				removeLoadingIndicator();

				const chatContainer = document.getElementById("chat-container");
				if (!chatContainer) return;

				const loadingIndicator = chatContainer.querySelector(
					"#loading-indicator, .loading-indicator"
				);
				chatContainer.innerHTML = "";
				if (loadingIndicator) {
					chatContainer.appendChild(loadingIndicator);
				}

				if (!data.data || data.data.length === 0) return;

				const sortedMessages = data.data.sort((a, b) => {
					const timeA = new Date(a.created_at).getTime();
					const timeB = new Date(b.created_at).getTime();
					return timeA - timeB;
				});

				sortedMessages.forEach((msg) => {
					if (msg.role === "system") return;

					if (msg.role === "assistant") {
						if (msg.content && Array.isArray(msg.content)) {
							msg.content.forEach((contentItem) => {
								if (
									contentItem.type === "text" &&
									contentItem.text &&
									contentItem.text.value
								) {
									displayMessage(
										"Assistant: " + contentItem.text.value,
										"assistant-message"
									);
								}
							});
						}
					} else if (msg.role === "user") {
						if (msg.content && Array.isArray(msg.content)) {
							msg.content.forEach((contentItem) => {
								if (
									contentItem.type === "text" &&
									contentItem.text &&
									contentItem.text.value
								) {
									const content = contentItem.text.value;
									if (
										!content.includes(
											"This is the individual we are making a decision on"
										) &&
										!content.includes("system prompt") &&
										!content.includes("individual we are making a decision")
									) {
										displayMessage("User: " + content, "user-message");
									}
								}
							});
						}
					}
				});

				removeLoadingIndicator();
			})
			.catch((error) => {
				removeLoadingIndicator();
				console.error("Error getting messages:", error);
			});
	}

	// Display message
	function displayMessage(message, className) {
		const chatContainer = document.getElementById("chat-container");
		if (!chatContainer) return;

		const messageElement = document.createElement("div");
		messageElement.className = className;
		messageElement.style.cssText = `
            padding: 12px 16px;
            border-radius: 12px;
            margin-bottom: 12px;
            max-width: 80%;
            word-wrap: break-word;
            font-size: 14px;
            line-height: 1.5;
            box-shadow: 0 1px 2px rgba(0,0,0,0.1);
        `;

		if (className === "user-message") {
			messageElement.style.cssText += `
                background-color: #E3F2FD;
                color: #1565C0;
                margin-left: auto;
                border-bottom-right-radius: 4px;
            `;
			messageElement.textContent = message;
		} else {
			messageElement.style.cssText += `
                background-color: #F5F5F5;
                color: #424242;
                margin-right: auto;
                border-bottom-left-radius: 4px;
            `;
			messageElement.innerHTML = message.replace("Assistant: ", "");
		}

		chatContainer.appendChild(messageElement);

		if (
			className === "user-message" &&
			!document.getElementById("loading-indicator")
		) {
			const loadingContainer = document.createElement("div");
			loadingContainer.id = "loading-indicator";
			loadingContainer.style.cssText = `
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 12px 16px;
                margin: 8px 0;
                background-color: #F5F5F5;
                border-radius: 12px;
                max-width: 80%;
                border-bottom-left-radius: 4px;
            `;

			const loadingText = document.createElement("span");
			loadingText.textContent = "Assistant is thinking";
			loadingText.style.cssText = `
                font-size: 14px;
                color: #757575;
                font-style: italic;
            `;

			const dotsContainer = document.createElement("div");
			dotsContainer.style.cssText = `
                display: flex;
                gap: 4px;
                align-items: center;
            `;

			for (let i = 0; i < 3; i++) {
				const dot = document.createElement("div");
				dot.style.cssText = `
                    width: 6px;
                    height: 6px;
                    border-radius: 50%;
                    background-color: #2196F3;
                    animation: loadingPulse 1.4s ease-in-out infinite both;
                    animation-delay: ${i * 0.2}s;
                `;
				dotsContainer.appendChild(dot);
			}

			if (!document.getElementById("loading-animation-style")) {
				const style = document.createElement("style");
				style.id = "loading-animation-style";
				style.textContent = `
                    @keyframes loadingPulse {
                        0%, 80%, 100% {
                            transform: scale(0.8);
                            opacity: 0.5;
                        }
                        40% {
                            transform: scale(1);
                            opacity: 1;
                        }
                    }
                `;
				document.head.appendChild(style);
			}

			loadingContainer.appendChild(loadingText);
			loadingContainer.appendChild(dotsContainer);
			chatContainer.appendChild(loadingContainer);
		}

		chatContainer.scrollTop = chatContainer.scrollHeight;
	}

	// Initialize everything
	initializeInterface();
});
