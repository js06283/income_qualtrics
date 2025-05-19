document.addEventListener("DOMContentLoaded", function () {
	console.log("DOM fully loaded");
	// Your Qualtrics setup code or DOM manipulations here
	var that = this;

	var assistantId = "asst_7sPWm8bv3NuRAlDkQX31v9JP";
	var threadId = null;

	// Create header for the chat interface
	var chatHeader = document.createElement("div");
	chatHeader.style.marginBottom = "15px";
	chatHeader.style.color = "#1565C0";
	chatHeader.style.fontSize = "20px";
	chatHeader.style.fontWeight = "500";

	var chatTitle = document.createElement("div");
	chatTitle.textContent = "Ask Questions About This Person";
	chatTitle.style.marginBottom = "8px";

	var chatSubtitle = document.createElement("div");
	chatSubtitle.textContent =
		"Chat with AI to understand more about their income potential";
	chatSubtitle.style.fontSize = "14px";
	chatSubtitle.style.color = "#666";
	chatSubtitle.style.fontWeight = "normal";

	chatHeader.appendChild(chatTitle);
	chatHeader.appendChild(chatSubtitle);

	// Create and style the chat container
	var chatContainer = document.createElement("div");
	chatContainer.id = "chat-container";
	chatContainer.style.height = "450px";
	chatContainer.style.overflowY = "scroll";
	chatContainer.style.border = "1px solid #e0e0e0";
	chatContainer.style.borderRadius = "12px";
	chatContainer.style.padding = "20px";
	chatContainer.style.backgroundColor = "#ffffff";
	chatContainer.style.boxShadow = "0 1px 3px rgba(0,0,0,0.1)";
	chatContainer.style.marginBottom = "15px";

	// Create question selector
	var questionSelector = document.createElement("div");
	questionSelector.style.marginBottom = "15px";
	questionSelector.style.padding = "15px";
	questionSelector.style.backgroundColor = "#f5f5f5";
	questionSelector.style.borderRadius = "8px";
	questionSelector.style.border = "1px solid #e0e0e0";

	var selectorLabel = document.createElement("div");
	selectorLabel.textContent = "Quick Questions";
	selectorLabel.style.marginBottom = "10px";
	selectorLabel.style.fontSize = "14px";
	selectorLabel.style.fontWeight = "600";
	selectorLabel.style.color = "#424242";

	var questionsGrid = document.createElement("div");
	questionsGrid.style.display = "grid";
	questionsGrid.style.gridTemplateColumns = "repeat(2, 1fr)";
	questionsGrid.style.gap = "8px";

	// Define common questions
	const commonQuestions = [
		"What factors suggest they might earn over 50k?",
		"How does their education impact their income?",
		"What role does their occupation play?",
		"How does their location affect income?",
		"Compare to similar demographics",
		"What career growth potential exists?",
	];

	// Create question buttons
	commonQuestions.forEach((question) => {
		var questionButton = document.createElement("button");
		questionButton.textContent = question;
		questionButton.style.padding = "8px 12px";
		questionButton.style.backgroundColor = "#ffffff";
		questionButton.style.border = "1px solid #e0e0e0";
		questionButton.style.borderRadius = "6px";
		questionButton.style.cursor = "pointer";
		questionButton.style.fontSize = "13px";
		questionButton.style.color = "#1976D2";
		questionButton.style.textAlign = "left";
		questionButton.style.transition = "all 0.2s ease";
		questionButton.style.width = "100%";
		questionButton.style.whiteSpace = "normal";

		// Add hover effects
		questionButton.addEventListener("mouseover", function () {
			this.style.backgroundColor = "#E3F2FD";
			this.style.borderColor = "#2196F3";
		});
		questionButton.addEventListener("mouseout", function () {
			this.style.backgroundColor = "#ffffff";
			this.style.borderColor = "#e0e0e0";
		});

		// Add click handler
		questionButton.addEventListener("click", function () {
			inputBox.value = this.textContent;
			sendMessage();
		});

		questionsGrid.appendChild(questionButton);
	});

	questionSelector.appendChild(selectorLabel);
	questionSelector.appendChild(questionsGrid);

	// Create a container for input elements
	var inputContainer = document.createElement("div");
	inputContainer.style.display = "flex";
	inputContainer.style.gap = "10px";
	inputContainer.style.marginTop = "20px";

	// Style the input box
	var inputBox = document.createElement("input");
	inputBox.type = "text";
	inputBox.id = "user-input";
	inputBox.placeholder =
		"Ask any questions about this person's income potential...";
	inputBox.style.width = "100%";
	inputBox.style.padding = "12px 15px";
	inputBox.style.borderRadius = "8px";
	inputBox.style.border = "2px solid #e0e0e0";
	inputBox.style.fontSize = "14px";
	inputBox.style.transition = "border-color 0.3s ease";
	inputBox.style.outline = "none";

	// Add focus effect
	inputBox.addEventListener("focus", function () {
		this.style.borderColor = "#2196F3";
	});
	inputBox.addEventListener("blur", function () {
		this.style.borderColor = "#e0e0e0";
	});

	// Style the send button
	var sendButton = document.createElement("button");
	sendButton.textContent = "Send";
	sendButton.onclick = sendMessage;
	sendButton.style.padding = "12px 25px";
	sendButton.style.backgroundColor = "#2196F3";
	sendButton.style.color = "white";
	sendButton.style.border = "none";
	sendButton.style.borderRadius = "8px";
	sendButton.style.cursor = "pointer";
	sendButton.style.fontSize = "14px";
	sendButton.style.fontWeight = "600";
	sendButton.style.transition = "background-color 0.3s ease";
	sendButton.style.minWidth = "100px";

	// Add hover effect for send button
	sendButton.addEventListener("mouseover", function () {
		this.style.backgroundColor = "#1976D2";
	});
	sendButton.addEventListener("mouseout", function () {
		this.style.backgroundColor = "#2196F3";
	});

	// Find the right panel and add the chat interface
	var rightPanel = document.querySelector(".right-panel");
	rightPanel.appendChild(chatHeader);
	rightPanel.appendChild(chatContainer);
	rightPanel.appendChild(questionSelector);
	rightPanel.appendChild(inputContainer);

	// Add elements to input container
	inputContainer.appendChild(inputBox);
	inputContainer.appendChild(sendButton);

	function sendMessage() {
		var userInput = inputBox.value;
		if (!userInput) return;

		displayMessage("User: " + userInput, "user-message");
		inputBox.value = "";

		if (!threadId) {
			fetch("https://openai-proxy-iota-nine.vercel.app/openai-proxy", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					path: "/threads",
					method: "POST",
					body: {
						messages: [
							{
								role: "user",
								content:
									"This is the individual we are making a decision on whether they earn more than 50k or not: {'Unnamed: 0': 64195, 'AGEP': 44, 'COW': 'Employee of a private not-for-profit, tax-exempt, or charitable organization', 'SCHL': 'Professional degree beyond a bachelor's degree', 'MAR': 'Married', 'OCCP': 'CMS-Clergy', 'POBP': 'Ohio/OH', 'RELP': 'Husband/wife', 'WKHP': 50.0, 'SEX': 'Male', 'RAC1P': 'White alone', 'Model_Prediction_Probability': 0.5381995226185238}",
							},
						],
					},
				}),
			})
				.then((response) => response.json())
				.then((data) => {
					console.log("OpenAI response error:", data.raw);
					console.log("Thread creation response:", data);
					const newThreadId = data.id;
					threadId = newThreadId;
					console.log("Parsed threadId:", newThreadId);
					return sendMessageToThread(userInput, newThreadId);
				})
				.catch((error) => console.error("Error creating thread:", error));
		} else {
			sendMessageToThread(userInput, threadId);
		}
	}

	function sendMessageToThread(userInput, threadId) {
		console.log("Thread id has been set (message):", threadId);
		fetch("https://openai-proxy-iota-nine.vercel.app/openai-proxy", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				path: "/threads/" + threadId + "/messages",
				method: "POST",
				body: {
					role: "user",
					content: userInput,
				},
			}),
		})
			.then((response) => response.json())
			.then(() => {
				console.log("Thread id has been set (run):", threadId);
				return fetch("https://openai-proxy-iota-nine.vercel.app/openai-proxy", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						path: "/threads/" + threadId + "/runs",
						method: "POST",
						body: {
							assistant_id: assistantId,
						},
					}),
				});
			})
			.then((response) => response.json())
			.then((data) => {
				console.log("🧪 run ID:", data.id);
				console.log("🧪 Full run response:", data);
				if (!data.id) {
					console.error("❌ No run ID returned!", data);
					return;
				}

				checkRunStatus(data.id, threadId);
			})
			.catch((error) => console.error("Error sending message:", error));
	}

	function checkRunStatus(runId, threadId) {
		if (!threadId) {
			console.error("❌ Missing threadId in checkRunStatus!");
			return;
		}

		console.log("🧪 Checking run:", runId, "for thread:", threadId);
		fetch("https://openai-proxy-iota-nine.vercel.app/openai-proxy", {
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
				} else if (data.status === "failed") {
					displayMessage(
						"Assistant: Sorry, there was an error processing your request.",
						"assistant-message"
					);
				} else {
					setTimeout(() => checkRunStatus(runId, threadId), 1000);
				}
			})
			.catch((error) => console.error("Error checking run status:", error));
	}

	function getMessages() {
		fetch("https://openai-proxy-iota-nine.vercel.app/openai-proxy", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				path: "/threads/" + threadId + "/messages",
				method: "GET",
			}),
		})
			.then((response) => response.json())
			.then((data) => {
				var loadingEl = document.getElementById("loading-indicator");
				if (loadingEl) {
					loadingEl.remove();
				}
				var assistantMessage = data.data.find(
					(msg) => msg.role === "assistant"
				);
				if (assistantMessage) {
					displayMessage(
						"Assistant: " + assistantMessage.content[0].text.value,
						"assistant-message"
					);
				}
			})
			.catch((error) => {
				var loadingEl = document.getElementById("loading-indicator");
				if (loadingEl) loadingEl.remove();
				console.error("Error getting messages:", error);
			});
	}

	function displayMessage(message, className) {
		var messageElement = document.createElement("div");
		messageElement.className = className;
		messageElement.style.padding = "12px 16px";
		messageElement.style.borderRadius = "12px";
		messageElement.style.marginBottom = "12px";
		messageElement.style.maxWidth = "80%";
		messageElement.style.wordWrap = "break-word";
		messageElement.style.fontSize = "14px";
		messageElement.style.lineHeight = "1.5";
		messageElement.style.boxShadow = "0 1px 2px rgba(0,0,0,0.1)";

		if (className === "user-message") {
			messageElement.style.backgroundColor = "#E3F2FD";
			messageElement.style.color = "#1565C0";
			messageElement.style.marginLeft = "auto";
			messageElement.style.borderBottomRightRadius = "4px";
			messageElement.textContent = message;
		} else {
			messageElement.style.backgroundColor = "#F5F5F5";
			messageElement.style.color = "#424242";
			messageElement.style.marginRight = "auto";
			messageElement.style.borderBottomLeftRadius = "4px";

			// Format the assistant's message
			let formattedMessage = message.replace("Assistant: ", "");

			// Handle Markdown-style headers with #
			formattedMessage = formattedMessage.replace(
				/^(#{1,3})\s+(.+)$/gm,
				(match, hashes, content) => {
					const level = hashes.length;
					const fontSize = level === 1 ? "18px" : level === 2 ? "16px" : "15px";
					const margin = level === 1 ? "16px 0 12px" : "14px 0 10px";
					return `<h${level} style="margin: ${margin}; font-size: ${fontSize}; color: #1976D2; font-weight: 600;">${content}</h${level}>`;
				}
			);

			// Handle bold text with **
			formattedMessage = formattedMessage.replace(
				/\*\*(.*?)\*\*/g,
				(match, content) => {
					return `<strong>${content}</strong>`;
				}
			);

			// Handle bullet points with better spacing
			let lines = formattedMessage.split("\n");
			let inList = false;
			formattedMessage = lines
				.map((line) => {
					if (line.trim().startsWith("- ")) {
						if (!inList) {
							inList = true;
							return (
								'<ul style="margin: 8px 0; padding-left: 20px; list-style-type: disc;">' +
								`<li style="margin: 6px 0; padding-left: 4px;">${line
									.trim()
									.substring(2)}</li>`
							);
						}
						return `<li style="margin: 6px 0; padding-left: 4px;">${line
							.trim()
							.substring(2)}</li>`;
					} else {
						if (inList) {
							inList = false;
							return "</ul>" + line;
						}
						return line;
					}
				})
				.join("\n");

			// Close any open list at the end
			if (inList) {
				formattedMessage += "</ul>";
			}

			// Handle line breaks, but not within lists
			formattedMessage = formattedMessage.replace(
				/\n(?!<\/?[uo]l|<li)/g,
				"<br>"
			);

			// Set the formatted HTML
			messageElement.innerHTML = formattedMessage;

			// Add some base styles for lists
			const style = document.createElement("style");
			style.textContent = `
				.${className} ul {
					margin: 8px 0;
					padding-left: 20px;
				}
				.${className} li {
					margin: 6px 0;
				}
			`;
			document.head.appendChild(style);
		}

		chatContainer.appendChild(messageElement);

		if (className === "user-message") {
			const loadingElement = document.createElement("p");
			loadingElement.id = "loading-indicator";
			loadingElement.textContent = "Assistant is typing...";
			loadingElement.style.fontStyle = "italic";
			loadingElement.style.color = "#757575";
			loadingElement.style.padding = "8px 12px";
			loadingElement.style.margin = "8px 0";
			loadingElement.style.fontSize = "13px";
			loadingElement.style.display = "inline-block";
			chatContainer.appendChild(loadingElement);
		}

		chatContainer.scrollTop = chatContainer.scrollHeight;
	}

	// ✅ Add event listener properly closed
	inputBox.addEventListener("keypress", function (event) {
		if (event.key === "Enter") {
			event.preventDefault();
			sendMessage();
		}
	});
});
