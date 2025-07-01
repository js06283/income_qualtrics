// Problem 1 - Essential JavaScript (Negative Outcome First)
document.addEventListener("DOMContentLoaded", function () {
	// Configuration
	const assistantId = "asst_EIzTKoQGOwC0Oy8Vve2QoYmz";
	const PROXY_URL = "https://openai-proxy-iota-nine.vercel.app/openai-proxy";

	// Problem 1 data (Negative outcome first)
	const problem1Data = {
		dict: '{"Age": 25, "Class of Worker": "Private", "Educational Attainment": "Some-college", "Marital Status": "Never-married", "Occupation": "Handlers-cleaners", "Place of Birth": "United-States", "Usual Hours Worked per Week": 35, "Sex": "Male", "Race": "Black"}',
		summary:
			"This person is a 25-year-old never-married black male with some college education working as a handler/cleaner for a private company. They work 35 hours per week and were born in the United States.",
		outcome: false,
	};

	// Define the 9 features (matching main.js)
	const FEATURES = [
		"Age",
		"Class of Worker",
		"Educational Attainment",
		"Marital Status",
		"Occupation",
		"Place of Birth",
		"Usual Hours Worked per Week",
		"Sex",
		"Race",
	];

	// Global variables
	let threadId = null;
	let usedQuestions = new Set();
	let currentFeature = "Age";

	// Initialize the interface
	function initializeInterface() {
		updateTable();
		updateSummary();
		updateMLPrediction();
		createChatInterface();
		createFeatureSelector();
	}

	// Update the data table
	function updateTable() {
		const table = document.getElementById("table");
		const tbody = table.querySelector("tbody");

		// Clear existing rows except header
		const headerRow = tbody.querySelector("tr");
		tbody.innerHTML = "";
		tbody.appendChild(headerRow);

		const dataDict = JSON.parse(problem1Data.dict);
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
			summaryElement.textContent = problem1Data.summary;
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

		// Create refresh button container
		const refreshContainer = document.createElement("div");
		refreshContainer.style.cssText = `
            display: flex;
            justify-content: center;
            margin-top: 10px;
        `;

		const refreshButton = document.createElement("button");
		refreshButton.textContent = "Refresh Feature Questions";
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
			refreshFeatureQuestions();
		});

		refreshContainer.appendChild(refreshButton);
		quickQuestionsContainer.appendChild(refreshContainer);

		// Add to the right panel
		const rightPanel = document.getElementById("right-panel");
		rightPanel.appendChild(chatContainer);
		rightPanel.appendChild(inputContainer);
		rightPanel.appendChild(quickQuestionsContainer);
	}

	// Create feature selector (matching main.js)
	function createFeatureSelector() {
		// Remove existing feature selector if any
		const existingSelector = document.getElementById("inline-feature-selector");
		if (existingSelector) {
			existingSelector.remove();
		}

		// Create feature selector container
		const featureContainer = document.createElement("div");
		featureContainer.style.cssText = `
			margin-bottom: 12px;
			margin-top:12px;
			padding: 5px;
			background: #f8f9fa;
			border-radius: 6px;
			border: 1px solid #e0e0e0;
		`;

		const featureLabel = document.createElement("label");
		featureLabel.textContent = "Select a feature to ask about:";
		featureLabel.style.cssText = `
			display: block;
			margin-bottom: 8px;
			color: #333;
			font-size: 14px;
			font-weight: 500;
		`;

		const featureSelector = document.createElement("select");
		featureSelector.id = "inline-feature-selector";
		featureSelector.style.cssText = `
			padding: 8px 12px;
			border: 2px solid #e0e0e0;
			border-radius: 6px;
			font-size: 14px;
			background: white;
			color: #333;
			cursor: pointer;
			width: 100%;
			max-width: 300px;
			transition: border-color 0.3s ease;
		`;

		// Add focus effect
		featureSelector.addEventListener("focus", function () {
			this.style.outline = "none";
			this.style.borderColor = "#2196f3";
		});

		// Populate with features in random order
		featureSelector.innerHTML = '<option value="">Select feature...</option>';

		// Create a shuffled copy of the features array
		const shuffledFeatures = [...FEATURES].sort(() => Math.random() - 0.5);

		shuffledFeatures.forEach((feature) => {
			const option = document.createElement("option");
			option.value = feature;
			option.textContent = feature;
			featureSelector.appendChild(option);
		});

		featureContainer.appendChild(featureLabel);
		featureContainer.appendChild(featureSelector);

		// Add to the right panel before the quick questions container
		const rightPanel = document.getElementById("right-panel");
		const quickQuestionsContainer = rightPanel.querySelector(
			".quick-questions-container"
		);
		if (rightPanel && quickQuestionsContainer) {
			rightPanel.insertBefore(featureContainer, quickQuestionsContainer);
		}

		// Add event listener for feature selection
		featureSelector.addEventListener("change", function () {
			const selectedFeature = this.value;
			if (selectedFeature) {
				currentFeature = selectedFeature;
				updateChatQuestionPool(selectedFeature);
			}
		});

		// Auto-select first feature
		if (FEATURES.length > 0) {
			featureSelector.value = FEATURES[0];
			currentFeature = FEATURES[0];
			updateChatQuestionPool(FEATURES[0]);
		}
	}

	// Update the chat question pool to feature-specific questions (matching main.js)
	function updateChatQuestionPool(featureName) {
		const dataDict = JSON.parse(problem1Data.dict);
		const featureValue = dataDict[featureName];

		// Define feature-specific question pools (matching main.js)
		const featureQuestionPools = {
			Age: [
				`How does this person's age of ${featureValue} affect their income potential?`,
				`What age-related factors could influence this person's earning capacity?`,
				`How does age ${featureValue} compare to peak earning years?`,
				`What age-related patterns suggest about their income level?`,
				`How might age ${featureValue} impact their likelihood of earning above 50k?`,
				`What does age ${featureValue} tell us about their income bracket?`,
			],
			"Class of Worker": [
				`How does being a ${featureValue} affect income potential?`,
				`How does ${featureValue} work compare to other employment types?`,
				`What benefits and drawbacks come with ${featureValue} work?`,
				`What does ${featureValue} work suggest about their income level?`,
				`How might ${featureValue} status affect their earnings?`,
				`What income patterns are typical for ${featureValue} workers?`,
			],
			"Educational Attainment": [
				`How does ${featureValue} education impact income potential?`,
				`What are typical earnings for someone with ${featureValue} education?`,
				`How does ${featureValue} compare to other education levels?`,
				`What does ${featureValue} education suggest about income level?`,
				`How might ${featureValue} education affect their earnings?`,
				`What income patterns are associated with ${featureValue} education?`,
			],
			"Marital Status": [
				`How does being ${featureValue} affect income potential?`,
				`What are typical income patterns for ${featureValue} individuals?`,
				`How does ${featureValue} status impact income level?`,
				`What financial considerations come with ${featureValue} status?`,
				`How might ${featureValue} status affect their earnings?`,
				`What does ${featureValue} status suggest about income bracket?`,
			],
			Occupation: [
				`How does working as a ${featureValue} affect income potential?`,
				`What are typical earnings for ${featureValue} professionals?`,
				`How does ${featureValue} compare to other occupations?`,
				`What does ${featureValue} work suggest about income level?`,
				`How might ${featureValue} occupation affect their earnings?`,
				`What income patterns are typical for ${featureValue} workers?`,
			],
			"Place of Birth": [
				`How does being born in ${featureValue} affect income potential?`,
				`What are typical earnings for people from ${featureValue}?`,
				`How does ${featureValue} background influence income level?`,
				`What does ${featureValue} origin suggest about earnings?`,
				`How might ${featureValue} background affect their income?`,
				`What income patterns are associated with ${featureValue} origin?`,
			],
			"Usual Hours Worked per Week": [
				`How do ${featureValue} work hours affect income potential?`,
				`What are typical earnings for someone working ${featureValue} hours?`,
				`How does ${featureValue} hours compare to full-time work?`,
				`What does ${featureValue} hours suggest about income level?`,
				`How might ${featureValue} hours affect their earnings?`,
				`What income patterns are typical for ${featureValue} hour workers?`,
			],
			Sex: [
				`How does being ${featureValue} affect income potential?`,
				`What are typical earnings for ${featureValue} workers?`,
				`How does ${featureValue} gender influence income level?`,
				`What does ${featureValue} gender suggest about earnings?`,
				`How might ${featureValue} gender affect their income?`,
				`What income patterns are typical for ${featureValue} workers?`,
			],
			Race: [
				`How does being ${featureValue} affect income potential?`,
				`What are typical earnings for ${featureValue} individuals?`,
				`How does ${featureValue} background influence income level?`,
				`What does ${featureValue} race suggest about earnings?`,
				`How might ${featureValue} race affect their income?`,
				`What income patterns are associated with ${featureValue} background?`,
			],
		};

		// Get the feature-specific questions
		const featureQuestions = featureQuestionPools[featureName] || [
			`How does this person's ${featureName} of ${featureValue} affect their income?`,
			`What are the implications of ${featureName}: ${featureValue} for income?`,
			`How might ${featureName} influence this person's earning potential?`,
		];

		// Update the quick questions in the chat interface
		const quickQuestionsContainer = document.querySelector(
			".quick-questions-container"
		);
		if (quickQuestionsContainer) {
			// Clear existing questions completely
			quickQuestionsContainer.innerHTML = "";

			// Add only feature-specific questions (first 3)
			featureQuestions.slice(0, 3).forEach((question) => {
				const questionButton = document.createElement("button");
				questionButton.textContent = question;
				questionButton.style.flex = "1";
				questionButton.style.padding = "8px 8px";
				questionButton.style.backgroundColor = "#ffffff";
				questionButton.style.border = "1px solid #e0e0e0";
				questionButton.style.borderRadius = "6px";
				questionButton.style.cursor = "pointer";
				questionButton.style.fontSize = "14px";
				questionButton.style.color = "#1976D2";
				questionButton.style.textAlign = "center";
				questionButton.style.transition = "all 0.2s ease";
				questionButton.style.whiteSpace = "nowrap";
				questionButton.style.overflow = "hidden";
				questionButton.style.textOverflow = "ellipsis";

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
					const inputBox = document.getElementById("user-input");
					if (inputBox) {
						inputBox.value = this.textContent;
						sendMessage();
					}
				});

				quickQuestionsContainer.appendChild(questionButton);
			});

			// Create refresh button container for feature mode (now at the bottom)
			const refreshContainer = document.createElement("div");
			refreshContainer.style.cssText = `
				display: flex;
				justify-content: center;
				margin-top: 10px;
			`;

			// Create refresh button for feature mode
			const refreshButton = document.createElement("button");
			refreshButton.textContent = "Refresh Feature Questions";
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

			// Add hover effects
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
				refreshFeatureQuestions();
			});

			refreshContainer.appendChild(refreshButton);
			quickQuestionsContainer.appendChild(refreshContainer);
		}
	}

	// Refresh feature questions
	function refreshFeatureQuestions() {
		const dataDict = JSON.parse(problem1Data.dict);
		const featureValue = dataDict[currentFeature];

		// Define feature-specific question pools
		const featureQuestionPools = {
			Age: [
				`How does this person's age of ${featureValue} affect their income potential?`,
				`What age-related factors could influence this person's earning capacity?`,
				`How does age ${featureValue} compare to peak earning years?`,
				`What age-related patterns suggest about their income level?`,
				`How might age ${featureValue} impact their likelihood of earning above 50k?`,
				`What does age ${featureValue} tell us about their income bracket?`,
			],
			"Class of Worker": [
				`How does being a ${featureValue} affect income potential?`,
				`How does ${featureValue} work compare to other employment types?`,
				`What benefits and drawbacks come with ${featureValue} work?`,
				`What does ${featureValue} work suggest about their income level?`,
				`How might ${featureValue} status affect their earnings?`,
				`What income patterns are typical for ${featureValue} workers?`,
			],
			"Educational Attainment": [
				`How does ${featureValue} education impact income potential?`,
				`What are typical earnings for someone with ${featureValue} education?`,
				`How does ${featureValue} compare to other education levels?`,
				`What does ${featureValue} education suggest about income level?`,
				`How might ${featureValue} education affect their earnings?`,
				`What income patterns are associated with ${featureValue} education?`,
			],
			"Marital Status": [
				`How does being ${featureValue} affect income potential?`,
				`What are typical income patterns for ${featureValue} individuals?`,
				`How does ${featureValue} status impact income level?`,
				`What financial considerations come with ${featureValue} status?`,
				`How might ${featureValue} status affect their earnings?`,
				`What does ${featureValue} status suggest about income bracket?`,
			],
			Occupation: [
				`How does working as a ${featureValue} affect income potential?`,
				`What are typical earnings for ${featureValue} professionals?`,
				`How does ${featureValue} compare to other occupations?`,
				`What does ${featureValue} work suggest about income level?`,
				`How might ${featureValue} occupation affect their earnings?`,
				`What income patterns are typical for ${featureValue} workers?`,
			],
			"Place of Birth": [
				`How does being born in ${featureValue} affect income potential?`,
				`What are typical earnings for people from ${featureValue}?`,
				`How does ${featureValue} background influence income level?`,
				`What does ${featureValue} origin suggest about earnings?`,
				`How might ${featureValue} background affect their income?`,
				`What income patterns are associated with ${featureValue} origin?`,
			],
			"Usual Hours Worked per Week": [
				`How do ${featureValue} work hours affect income potential?`,
				`What are typical earnings for someone working ${featureValue} hours?`,
				`How does ${featureValue} hours compare to full-time work?`,
				`What does ${featureValue} hours suggest about income level?`,
				`How might ${featureValue} hours affect their earnings?`,
				`What income patterns are typical for ${featureValue} hour workers?`,
			],
			Sex: [
				`How does being ${featureValue} affect income potential?`,
				`What are typical earnings for ${featureValue} workers?`,
				`How does ${featureValue} gender influence income level?`,
				`What does ${featureValue} gender suggest about earnings?`,
				`How might ${featureValue} gender affect their income?`,
				`What income patterns are typical for ${featureValue} workers?`,
			],
			Race: [
				`How does being ${featureValue} affect income potential?`,
				`What are typical earnings for ${featureValue} individuals?`,
				`How does ${featureValue} background influence income level?`,
				`What does ${featureValue} race suggest about earnings?`,
				`How might ${featureValue} race affect their income?`,
				`What income patterns are associated with ${featureValue} background?`,
			],
		};

		const featureQuestions = featureQuestionPools[currentFeature] || [];

		// Shuffle the questions and pick 3 random ones
		const shuffledQuestions = [...featureQuestions].sort(
			() => Math.random() - 0.5
		);
		const selectedQuestions = shuffledQuestions.slice(0, 3);

		// Update the quick questions container
		const quickQuestionsContainer = document.querySelector(
			".quick-questions-container"
		);
		if (quickQuestionsContainer) {
			// Clear existing questions but keep refresh button
			const refreshContainer =
				quickQuestionsContainer.querySelector("div:last-child");
			quickQuestionsContainer.innerHTML = "";

			// Add new random questions
			selectedQuestions.forEach((question) => {
				const questionButton = document.createElement("button");
				questionButton.textContent = question;
				questionButton.style.flex = "1";
				questionButton.style.padding = "8px 8px";
				questionButton.style.backgroundColor = "#ffffff";
				questionButton.style.border = "1px solid #e0e0e0";
				questionButton.style.borderRadius = "6px";
				questionButton.style.cursor = "pointer";
				questionButton.style.fontSize = "14px";
				questionButton.style.color = "#1976D2";
				questionButton.style.textAlign = "center";
				questionButton.style.transition = "all 0.2s ease";
				questionButton.style.whiteSpace = "nowrap";
				questionButton.style.overflow = "hidden";
				questionButton.style.textOverflow = "ellipsis";

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
					const inputBox = document.getElementById("user-input");
					if (inputBox) {
						inputBox.value = this.textContent;
						sendMessage();
					}
				});

				quickQuestionsContainer.appendChild(questionButton);
			});

			// Add back the refresh button
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
			const dataDict = JSON.parse(problem1Data.dict);
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
