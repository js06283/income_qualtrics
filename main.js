// Password protection modal (add at the very top)
(function () {
	const PASSWORD = "NewYork1!"; // Change this to your desired password
	const STORAGE_KEY = "qualtrics-ui-auth";

	function showPasswordModal() {
		const modal = document.createElement("div");
		modal.id = "password-modal";
		modal.style.position = "fixed";
		modal.style.top = "0";
		modal.style.left = "0";
		modal.style.width = "100vw";
		modal.style.height = "100vh";
		modal.style.background = "rgba(0,0,0,0.7)";
		modal.style.display = "flex";
		modal.style.justifyContent = "center";
		modal.style.alignItems = "center";
		modal.style.zIndex = "99999";

		const box = document.createElement("div");
		box.style.background = "#fff";
		box.style.padding = "32px 24px";
		box.style.borderRadius = "12px";
		box.style.boxShadow = "0 2px 16px rgba(0,0,0,0.2)";
		box.style.display = "flex";
		box.style.flexDirection = "column";
		box.style.alignItems = "center";

		const label = document.createElement("div");
		label.textContent = "Enter password to access this site:";
		label.style.marginBottom = "16px";
		label.style.fontSize = "16px";
		label.style.color = "#333";
		box.appendChild(label);

		const input = document.createElement("input");
		input.type = "password";
		input.style.padding = "10px 14px";
		input.style.fontSize = "16px";
		input.style.border = "1px solid #ccc";
		input.style.borderRadius = "6px";
		input.style.marginBottom = "12px";
		input.autofocus = true;
		box.appendChild(input);

		const error = document.createElement("div");
		error.style.color = "#d32f2f";
		error.style.fontSize = "14px";
		error.style.height = "18px";
		error.style.marginBottom = "8px";
		box.appendChild(error);

		const button = document.createElement("button");
		button.textContent = "Enter";
		button.style.padding = "10px 24px";
		button.style.background = "#1976D2";
		button.style.color = "#fff";
		button.style.border = "none";
		button.style.borderRadius = "6px";
		button.style.fontSize = "16px";
		button.style.cursor = "pointer";
		button.style.fontWeight = "600";
		box.appendChild(button);

		function tryAuth() {
			if (input.value === PASSWORD) {
				sessionStorage.setItem(STORAGE_KEY, "1");
				modal.remove();
			} else {
				error.textContent = "Incorrect password.";
				input.value = "";
				input.focus();
			}
		}

		button.onclick = tryAuth;
		input.onkeydown = function (e) {
			if (e.key === "Enter") tryAuth();
		};

		modal.appendChild(box);
		document.body.appendChild(modal);
		input.focus();
	}

	if (!sessionStorage.getItem(STORAGE_KEY)) {
		window.addEventListener("DOMContentLoaded", showPasswordModal, {
			once: true,
		});
	}
})();

document.addEventListener("DOMContentLoaded", function () {
	console.log("DOM fully loaded");
	// Your Qualtrics setup code or DOM manipulations here
	var that = this;

	var assistantId = "asst_EIzTKoQGOwC0Oy8Vve2QoYmz";
	var threadId = null;

	// Replace all previous proxy URLs with the new production endpoint
	function getProxyUrl() {
		// Check for URL parameter first (e.g., ?api=https://my-api.vercel.app)
		const urlParams = new URLSearchParams(window.location.search);
		const apiParam = urlParams.get("api");
		if (apiParam) {
			return `${apiParam}/openai-proxy`;
		}

		// Check for environment variable (if available)
		if (window.PROXY_URL) {
			return window.PROXY_URL;
		}

		// Default to the openai-proxy deployment
		return "https://openai-proxy-iota-nine.vercel.app/openai-proxy";
	}

	const PROXY_URL = getProxyUrl();
	console.log("🔗 Using proxy URL:", PROXY_URL);

	// Global variables
	var currentView = 1;
	var questionsData = [];
	var currentQuestionData = null;
	var currentProblemId = null;
	var answerKey = []; // Will be populated from CSV
	var currentType = null; // Track current type selection

	// Define the 9 features
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

	// Define the original question pool globally
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

	// Load questions data from CSV
	async function loadQuestionsData() {
		try {
			const response = await fetch("questions_630.csv");
			const csvText = await response.text();
			const lines = csvText.split("\n");
			const headers = lines[0].split(",");

			questionsData = [];
			answerKey = []; // Reset answer key

			for (let i = 1; i < lines.length; i++) {
				if (lines[i].trim() === "") continue;

				// Parse CSV line (handling quoted fields)
				const values = parseCSVLine(lines[i]);
				if (values.length >= 6) {
					// Updated to expect 6 columns including outcome
					const question = {
						dict: values[1], // dict is now in column 1
						problem: parseInt(values[2]), // problem is now in column 2
						name: values[3], // name is now in column 3
						summary: values[4], // summary is now in column 4
						outcome: values[5] === "True", // outcome is now in column 5
					};
					questionsData.push(question);

					// Build answer key from outcome column
					// Convert boolean to 0/1: False=0, True=1
					const answer = question.outcome ? 1 : 0;

					// Only add to answer key if we don't already have an answer for this problem
					if (answerKey[question.problem] === undefined) {
						answerKey[question.problem] = answer;
					}

					// Debug: Log person 19 specifically
					if (question.problem === 19) {
						console.log("Found person 19:", question);
					}
				}
			}

			console.log("Loaded questions data:", questionsData.length, "questions");
			console.log("Answer key:", answerKey);

			// Debug: Check what problem IDs we have
			const problemIds = [...new Set(questionsData.map((q) => q.problem))].sort(
				(a, b) => a - b
			);
			console.log("Available problem IDs:", problemIds);

			populateQuestionSelector();
		} catch (error) {
			console.error("Error loading questions data:", error);
		}
	}

	// Parse CSV line handling quoted fields
	function parseCSVLine(line) {
		const values = [];
		let current = "";
		let inQuotes = false;

		for (let i = 0; i < line.length; i++) {
			const char = line[i];

			if (char === '"') {
				inQuotes = !inQuotes;
			} else if (char === "," && !inQuotes) {
				values.push(current.trim());
				current = "";
			} else {
				current += char;
			}
		}

		values.push(current.trim());
		return values;
	}

	// Helper function to safely parse the dict string
	function parseDictString(dictString) {
		try {
			// Handle the specific case where Educational Attainment is missing quotes around Bachelor's degree
			// Do this BEFORE converting single quotes to double quotes
			let fixedDict = dictString.replace(
				/'Educational Attainment': Bachelor's degree/g,
				"'Educational Attainment': 'Bachelor's degree'"
			);

			// Now replace single quotes with double quotes
			fixedDict = fixedDict.replace(/'/g, '"');

			// Handle the specific case of ""Bachelor's degree"" -> "Bachelor's degree"
			fixedDict = fixedDict.replace(
				/""Bachelor's degree""/g,
				'"Bachelor\'s degree"'
			);

			// Handle any other double double quotes
			fixedDict = fixedDict.replace(/""/g, '"');

			return JSON.parse(fixedDict);
		} catch (error) {
			console.error("Error parsing dict string:", dictString);
			throw error;
		}
	}

	// Populate question selector dropdown
	function populateQuestionSelector() {
		const selector = document.getElementById("question-selector");
		selector.innerHTML = '<option value="">Select a person...</option>';

		// Group questions by problem ID
		const groupedQuestions = {};
		questionsData.forEach((question) => {
			if (!groupedQuestions[question.problem]) {
				groupedQuestions[question.problem] = [];
			}
			groupedQuestions[question.problem].push(question);
		});

		console.log(
			"Grouped questions keys:",
			Object.keys(groupedQuestions)
				.map((k) => parseInt(k))
				.sort((a, b) => a - b)
		);
		console.log("Person 19 in grouped questions:", groupedQuestions[19]);

		// Add options for each problem (0-19)
		for (let problemId = 0; problemId <= 19; problemId++) {
			const questions = groupedQuestions[problemId];
			console.log(
				`Checking problem ${problemId}:`,
				questions ? questions.length : 0,
				"questions"
			);
			if (questions && questions.length > 0) {
				const firstQuestion = questions[0];

				// Parse the data dictionary to get a brief description
				try {
					const dataDict = parseDictString(firstQuestion.dict);
					const age = dataDict.Age;
					const occupation = dataDict.Occupation;
					const education = dataDict["Educational Attainment"];

					const description = `Problem ${problemId}: ${age}yo, ${occupation}, ${education}`;

					const option = document.createElement("option");
					option.value = problemId;
					option.textContent = description;
					selector.appendChild(option);

					console.log(`Added option for problem ${problemId}:`, description);
				} catch (error) {
					console.error(
						"Error parsing data dict for problem",
						problemId,
						":",
						error
					);
					console.error("Problematic dict string:", firstQuestion.dict);
				}
			} else {
				console.log(`No questions found for problem ${problemId}`);
			}
		}

		// Add event listener for question selection
		selector.addEventListener("change", function () {
			const selectedProblemId = this.value;
			if (selectedProblemId) {
				currentProblemId = selectedProblemId;
				populateTypeSelector();
				populateSummarySelector(selectedProblemId);
				loadQuestionData(selectedProblemId);
			} else {
				currentProblemId = null;
				currentType = null;
				populateTypeSelector();
				populateSummarySelector(null);
				clearData();
			}
		});
	}

	// Populate summary selector dropdown
	function populateSummarySelector(problemId) {
		const selector = document.getElementById("summary-selector");

		if (!problemId) {
			selector.innerHTML = '<option value="">Select a person first...</option>';
			return;
		}

		selector.innerHTML = '<option value="">Select summary type...</option>';

		const questions = questionsData.filter((q) => q.problem == problemId);
		if (questions.length === 0) return;

		// Add options for each summary type
		questions.forEach((question) => {
			const option = document.createElement("option");
			option.value = question.name;
			option.textContent = question.name;
			selector.appendChild(option);
		});

		// Add event listener for summary selection
		selector.addEventListener("change", function () {
			const selectedSummaryName = this.value;
			if (selectedSummaryName && currentProblemId) {
				loadQuestionData(currentProblemId, selectedSummaryName);
			}
		});

		// Auto-select first summary type
		if (questions.length > 0) {
			selector.value = questions[0].name;
			loadQuestionData(problemId, questions[0].name);
		}
	}

	// Load and display question data
	function loadQuestionData(problemId, summaryName = null) {
		const questions = questionsData.filter((q) => q.problem == problemId);
		if (questions.length === 0) return;

		// Find the specific question with the selected summary name, or use the first one
		let question;
		if (summaryName) {
			question = questions.find((q) => q.name === summaryName);
		}
		if (!question) {
			question = questions[0]; // Default to first summary
		}

		currentQuestionData = question;

		try {
			const dataDict = parseDictString(question.dict);
			updateTable(dataDict);
			updateSummary(question.summary);
			updateMLPrediction();

			// Reset chat thread when new question is selected
			threadId = null;

			console.log(
				"Loaded question data for problem",
				problemId,
				"with summary:",
				question.name
			);

			// After updateTable, updateSummary, updateMLPrediction in loadQuestionData
			renderMCQ(problemId);
		} catch (error) {
			console.error("Error parsing question data:", error);
		}
	}

	// Clear all data
	function clearData() {
		const table = document.getElementById("table");
		const tbody = table.querySelector("tbody");

		// Clear existing rows except header
		const headerRow = tbody.querySelector("tr");
		tbody.innerHTML = "";
		tbody.appendChild(headerRow);

		// Add placeholder row
		const placeholderRow = document.createElement("tr");
		const placeholderCell = document.createElement("td");
		placeholderCell.colSpan = 2;
		placeholderCell.style.textAlign = "center";
		placeholderCell.style.color = "#666";
		placeholderCell.textContent = "Select a person to view data";
		placeholderRow.appendChild(placeholderCell);
		tbody.appendChild(placeholderRow);

		// Clear summary
		updateSummary("Loading summary...");
		updateMLPrediction();

		currentQuestionData = null;
		threadId = null;

		// In clearData(), also clear the MCQ
		const mcqContainer = document.getElementById("mcq-container");
		if (mcqContainer) mcqContainer.innerHTML = "";

		// Remove feature selector if it exists
		const featureSelector = document.getElementById("inline-feature-selector");
		if (featureSelector && featureSelector.parentElement) {
			featureSelector.parentElement.remove();
		}
	}

	// Update the data table
	function updateTable(dataDict) {
		const table = document.getElementById("table");
		const tbody = table.querySelector("tbody");

		// Clear existing rows except header
		const headerRow = tbody.querySelector("tr");
		tbody.innerHTML = "";
		tbody.appendChild(headerRow);

		// Define field mappings
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

		// Convert to array and shuffle the order
		const shuffledFields = Object.keys(fieldMappings).sort(
			() => Math.random() - 0.5
		);

		// Add data rows in shuffled order
		shuffledFields.forEach((key) => {
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
	function updateSummary(summary) {
		const summaryElement = document.querySelector(
			"#llm-summary .income-predictor-summary-content"
		);
		if (summaryElement) {
			summaryElement.textContent = summary;
		}
	}

	// Update the ML prediction (placeholder for now)
	function updateMLPrediction() {
		const predictionElement = document.querySelector(
			"#ml-prediction .income-predictor-summary-content"
		);
		if (predictionElement) {
			predictionElement.innerHTML =
				"The logistic model is <b>unsure</b> about this person's income and cannot provide a definitive answer.";
		}
	}

	// Function to select view
	window.selectView = function (viewNumber) {
		currentView = viewNumber;

		// Update button states
		document.querySelectorAll(".view-button").forEach((button, index) => {
			button.classList.remove("active");
			if (index === viewNumber - 1) {
				button.classList.add("active");
			}
		});

		// Show/hide elements based on view
		const llmSummary = document.getElementById("llm-summary");
		const mlPrediction = document.getElementById("ml-prediction");
		const rightPanel = document.getElementById("right-panel");

		// Reset all to hidden first
		llmSummary.classList.add("hidden");
		mlPrediction.classList.add("hidden");
		rightPanel.classList.add("hidden");

		// Show elements based on view
		if (viewNumber >= 1) {
			// Show ML prediction in all views (1, 2, 3)
			mlPrediction.classList.remove("hidden");
		}

		if (viewNumber >= 2) {
			// Show LLM summary in views 2 and 3
			llmSummary.classList.remove("hidden");
		}

		if (viewNumber === 3) {
			// Show chat interface only in view 3
			rightPanel.classList.remove("hidden");
			// Initialize chat interface if not already created
			if (!document.getElementById("chat-container")) {
				createChatInterface();
			}
		}

		// Refresh type selector based on new view
		if (currentProblemId) {
			populateTypeSelector();
		}

		// Hide feature selector when not in View 3
		if (viewNumber !== 3) {
			const featureSelector = document.getElementById(
				"inline-feature-selector"
			);
			if (featureSelector && featureSelector.parentElement) {
				featureSelector.parentElement.remove();
			}
		}
	};

	// Function to create chat interface
	function createChatInterface() {
		// Create and style the chat container
		var chatContainer = document.createElement("div");
		chatContainer.id = "chat-container";
		chatContainer.style.height = "350px";
		chatContainer.style.overflowY = "scroll";
		chatContainer.style.border = "1px solid #e0e0e0";
		chatContainer.style.borderRadius = "12px";
		chatContainer.style.padding = "20px";
		chatContainer.style.backgroundColor = "#ffffff";
		chatContainer.style.boxShadow = "0 1px 3px rgba(0,0,0,0.1)";
		chatContainer.style.marginBottom = "15px";
		chatContainer.style.width = "100%";

		// Add small message at the top of the chat container
		var chatMessage = document.createElement("div");
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

		// Create a container for input elements
		var inputContainer = document.createElement("div");
		inputContainer.style.display = "flex";
		inputContainer.style.gap = "10px";
		inputContainer.style.width = "100%";
		inputContainer.style.boxSizing = "border-box";

		// Style the input box
		var inputBox = document.createElement("input");
		inputBox.type = "text";
		inputBox.id = "user-input";
		inputBox.placeholder = "Type here...";
		inputBox.style.width = "100%";
		inputBox.style.padding = "12px 15px";
		inputBox.style.borderRadius = "8px";
		inputBox.style.border = "2px solid #e0e0e0";
		inputBox.style.fontSize = "14px";
		inputBox.style.transition = "border-color 0.3s ease";
		inputBox.style.outline = "none";
		inputBox.style.boxSizing = "border-box";

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

		// Style the send button
		var sendButton = document.createElement("button");
		sendButton.textContent = "Send";
		sendButton.onclick = sendMessage;
		sendButton.style.padding = "12px 20px";
		sendButton.style.backgroundColor = "#2196F3";
		sendButton.style.color = "white";
		sendButton.style.border = "none";
		sendButton.style.borderRadius = "8px";
		sendButton.style.cursor = "pointer";
		sendButton.style.fontSize = "14px";
		sendButton.style.fontWeight = "600";
		sendButton.style.transition = "background-color 0.3s ease";
		sendButton.style.whiteSpace = "nowrap";
		sendButton.style.flexShrink = "0";

		// Add hover effect for send button
		sendButton.addEventListener("mouseover", function () {
			this.style.backgroundColor = "#1976D2";
		});
		sendButton.addEventListener("mouseout", function () {
			this.style.backgroundColor = "#2196F3";
		});

		// Add elements to input container
		inputContainer.appendChild(inputBox);
		inputContainer.appendChild(sendButton);

		// Create quick questions container for bottom buttons
		var quickQuestionsContainer = document.createElement("div");
		quickQuestionsContainer.className = "quick-questions-container";
		quickQuestionsContainer.style.display = "flex";
		quickQuestionsContainer.style.flexDirection = "column";
		quickQuestionsContainer.style.gap = "10px";
		quickQuestionsContainer.style.marginTop = "15px";
		quickQuestionsContainer.style.width = "100%";

		// Define pool of questions
		const questionPool = [
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

		// Track used questions to avoid repetition
		var usedQuestions = new Set();
		var currentQuestions = [];

		// Function to get random questions
		function getRandomQuestions(count = 3) {
			const availableQuestions = questionPool.filter(
				(q) => !usedQuestions.has(q)
			);

			// If we've used most questions, reset the used set
			if (availableQuestions.length < count) {
				usedQuestions.clear();
				return getRandomQuestions(count);
			}

			const selected = [];
			for (let i = 0; i < count; i++) {
				const randomIndex = Math.floor(
					Math.random() * availableQuestions.length
				);
				const question = availableQuestions.splice(randomIndex, 1)[0];
				selected.push(question);
				usedQuestions.add(question);
			}

			return selected;
		}

		// Function to create question button
		function createQuestionButton(question) {
			var questionButton = document.createElement("button");
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
				inputBox.value = this.textContent;
				sendMessage();

				// Replace this button with a new question
				replaceQuestionButton(this);
			});

			return questionButton;
		}

		// Function to replace a question button with a new one
		function replaceQuestionButton(oldButton) {
			const newQuestions = getRandomQuestions(1);
			if (newQuestions.length > 0) {
				const newButton = createQuestionButton(newQuestions[0]);
				oldButton.parentNode.replaceChild(newButton, oldButton);
			}
		}

		// Initialize with 3 random questions
		currentQuestions = getRandomQuestions(3);
		currentQuestions.forEach((question) => {
			const questionButton = createQuestionButton(question);
			quickQuestionsContainer.appendChild(questionButton);
		});

		// Create refresh button container (now at the bottom)
		const refreshContainer = document.createElement("div");
		refreshContainer.style.cssText = `
			display: flex;
			justify-content: center;
			margin-top: 10px;
		`;

		// Create refresh button
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

		// Add click handler
		refreshButton.addEventListener("click", function () {
			refreshQuickQuestions();
		});

		refreshContainer.appendChild(refreshButton);
		quickQuestionsContainer.appendChild(refreshContainer);

		// Find the right panel and add the chat interface
		var rightPanel = document.getElementById("right-panel");
		rightPanel.appendChild(chatContainer);
		rightPanel.appendChild(inputContainer);
		rightPanel.appendChild(quickQuestionsContainer);
	}

	// Initialize with view 1 (table only) and load questions data
	selectView(1);
	loadQuestionsData();

	function sendMessage() {
		// Check if chat interface exists (only available in view 3)
		const inputBox = document.getElementById("user-input");
		if (!inputBox) {
			console.log("Chat interface not available in current view");
			return;
		}

		// Check if a question is selected
		if (!currentQuestionData) {
			displayMessage("Please select a person first.", "assistant-message");
			return;
		}

		var userInput = inputBox.value;
		if (!userInput) return;

		displayMessage("User: " + userInput, "user-message");
		inputBox.value = "";

		if (!threadId) {
			// Create the initial message with the current person's data
			const dataDict = JSON.parse(currentQuestionData.dict.replace(/'/g, '"'));
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
						messages: [
							{
								role: "user",
								content: initialMessage,
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
		fetch(PROXY_URL, {
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
				return fetch(PROXY_URL, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						path: "/threads/" + threadId + "/runs",
						method: "POST",
						body: {
							assistant_id: assistantId,
							tool_choice: "required",
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
			// Remove loading indicator if there's an error
			removeLoadingIndicator();
			return;
		}

		console.log("🧪 Checking run:", runId, "for thread:", threadId);
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
				} else if (data.status === "failed") {
					// Remove loading indicator and show error message
					removeLoadingIndicator();
					displayMessage(
						"Assistant: Sorry, there was an error processing your request.",
						"assistant-message"
					);
				} else if (data.status === "expired") {
					// Remove loading indicator and show error message
					removeLoadingIndicator();
					displayMessage(
						"Assistant: The request timed out. Please try again.",
						"assistant-message"
					);
				} else {
					setTimeout(() => checkRunStatus(runId, threadId), 1000);
				}
			})
			.catch((error) => {
				// Remove loading indicator on error
				removeLoadingIndicator();
				console.error("Error checking run status:", error);
				displayMessage(
					"Assistant: Sorry, there was an error checking the response status.",
					"assistant-message"
				);
			});
	}

	// Helper function to remove loading indicator
	function removeLoadingIndicator() {
		const loadingEl = document.getElementById("loading-indicator");
		if (loadingEl) {
			console.log("🧹 Force removing loading indicator");
			loadingEl.remove();
		}

		// Check if chat container exists before trying to query it
		const chatContainer = document.getElementById("chat-container");
		if (chatContainer) {
			// Also remove any elements with loading indicator
			const allElements = chatContainer.querySelectorAll("*");
			allElements.forEach((el) => {
				if (
					el.id === "loading-indicator" ||
					el.classList.contains("loading-indicator")
				) {
					console.log("🧹 Removing loading indicator element");
					el.remove();
				}
			});
		}
	}

	function getMessages() {
		console.log("🔍 getMessages() called - checking for loading indicator");
		var existingLoadingEl = document.getElementById("loading-indicator");
		if (existingLoadingEl) {
			console.log("🔍 Found existing loading indicator, will remove it");
		} else {
			console.log("🔍 No existing loading indicator found");
		}

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
				console.log("📝 Response received, removing loading indicator");
				// Always remove loading indicator when we get a response
				var loadingEl = document.getElementById("loading-indicator");
				if (loadingEl) {
					console.log("✅ Removing loading indicator");
					loadingEl.remove();
				} else {
					console.log("⚠️ No loading indicator found to remove");
				}

				// Check if chat container exists
				const chatContainer = document.getElementById("chat-container");
				if (!chatContainer) {
					console.log("❌ Chat container not found, cannot display messages");
					return;
				}

				// Clear the chat container to show fresh conversation
				// But preserve any loading indicator that might be there
				const loadingIndicator = chatContainer.querySelector(
					"#loading-indicator, .loading-indicator"
				);
				chatContainer.innerHTML = "";
				if (loadingIndicator) {
					chatContainer.appendChild(loadingIndicator);
				}

				console.log("📝 Total messages received:", data.data.length);
				console.log("📝 Messages structure:", data.data);

				// If no messages, just return (loading indicator already removed)
				if (!data.data || data.data.length === 0) {
					console.log("📝 No messages found");
					return;
				}

				// Sort messages by timestamp to ensure correct order
				const sortedMessages = data.data.sort((a, b) => {
					const timeA = new Date(a.created_at).getTime();
					const timeB = new Date(b.created_at).getTime();
					return timeA - timeB;
				});

				console.log("📝 Sorted messages:", sortedMessages);

				// Display all messages in the conversation
				sortedMessages.forEach((msg, msgIndex) => {
					console.log(`📝 Processing message ${msgIndex + 1}:`, msg);

					// Skip system messages (they shouldn't be displayed)
					if (msg.role === "system") {
						console.log(
							`📝 Skipping system message: ${msg.content[0]?.text?.value?.substring(
								0,
								50
							)}...`
						);
						return;
					}

					if (msg.role === "assistant") {
						console.log(
							`📝 Assistant message ${msgIndex + 1} has ${
								msg.content.length
							} content items`
						);

						// Handle multiple content items in assistant messages
						if (msg.content && Array.isArray(msg.content)) {
							msg.content.forEach((contentItem, contentIndex) => {
								console.log(
									`📝 Processing content item ${contentIndex + 1}:`,
									contentItem
								);
								if (
									contentItem.type === "text" &&
									contentItem.text &&
									contentItem.text.value
								) {
									console.log(
										`📝 Displaying assistant text content: ${contentItem.text.value.substring(
											0,
											50
										)}...`
									);
									displayMessage(
										"Assistant: " + contentItem.text.value,
										"assistant-message"
									);
								} else if (
									contentItem.type === "image_url" &&
									contentItem.image_url &&
									contentItem.image_url.url
								) {
									console.log(
										`📝 Displaying assistant image content: ${contentItem.image_url.url}`
									);
									displayImage(contentItem.image_url.url, "assistant-message");
								} else if (
									contentItem.type === "image_file" &&
									contentItem.image_file &&
									contentItem.image_file.file_id
								) {
									console.log(
										`📝 Displaying assistant file image content: ${contentItem.image_file.file_id}`
									);
									displayFileImage(
										contentItem.image_file.file_id,
										"assistant-message"
									);
								}
							});
						}
					} else if (msg.role === "user") {
						console.log(
							`📝 User message ${msgIndex + 1} has ${
								msg.content.length
							} content items`
						);

						// Handle multiple content items in user messages
						if (msg.content && Array.isArray(msg.content)) {
							msg.content.forEach((contentItem, contentIndex) => {
								console.log(
									`📝 Processing content item ${contentIndex + 1}:`,
									contentItem
								);
								if (
									contentItem.type === "text" &&
									contentItem.text &&
									contentItem.text.value
								) {
									// Skip system prompts that might be disguised as user messages
									const content = contentItem.text.value;
									if (
										content.includes(
											"This is the individual we are making a decision on"
										) ||
										content.includes("system prompt") ||
										content.includes("individual we are making a decision")
									) {
										console.log(
											`📝 Skipping system prompt disguised as user message: ${content.substring(
												0,
												50
											)}...`
										);
										return;
									}

									console.log(
										`📝 Displaying user content: ${content.substring(0, 50)}...`
									);
									displayMessage("User: " + content, "user-message");
								}
							});
						}
					}
				});

				// Force remove any remaining loading indicators after processing all messages
				removeLoadingIndicator();
			})
			.catch((error) => {
				console.log("❌ Error in getMessages, removing loading indicator");
				// Always remove loading indicator on error too
				var loadingEl = document.getElementById("loading-indicator");
				if (loadingEl) {
					console.log("✅ Removing loading indicator on error");
					loadingEl.remove();
				} else {
					console.log("⚠️ No loading indicator found to remove on error");
				}
				// Force remove any loading indicators
				removeLoadingIndicator();
				console.error("Error getting messages:", error);
			});
	}

	function displayMessage(message, className) {
		// Check if chat container exists
		const chatContainer = document.getElementById("chat-container");
		if (!chatContainer) {
			console.log("❌ Chat container not found, cannot display message");
			return;
		}

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

			// Handle code blocks with toggle functionality
			formattedMessage = formattedMessage.replace(
				/```(\w+)?\n([\s\S]*?)```/g,
				(match, language, code) => {
					const lang = language || "text";
					const codeId =
						"code-" +
						Date.now() +
						"-" +
						Math.random().toString(36).substr(2, 9);

					return `
						<div style="margin: 12px 0;">
							<button onclick="toggleCode('${codeId}')" style="
								background: #2196F3;
								color: white;
								border: none;
								padding: 8px 16px;
								border-radius: 6px;
								cursor: pointer;
								font-size: 12px;
								font-weight: 600;
								margin-bottom: 8px;
							">
								📄 Show ${lang.toUpperCase()} Code
							</button>
							<div id="${codeId}" style="display: none;">
								<pre style="
									background: #f8f9fa;
									border: 1px solid #e9ecef;
									border-radius: 6px;
									padding: 12px;
									margin: 0;
									overflow-x: auto;
									font-family: 'Courier New', monospace;
									font-size: 13px;
									line-height: 1.4;
									color: #333;
									white-space: pre-wrap;
									word-wrap: break-word;
								">${code.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre>
							</div>
						</div>
					`;
				}
			);

			// Handle inline code with backticks
			formattedMessage = formattedMessage.replace(
				/`([^`]+)`/g,
				'<code style="background: #f1f3f4; padding: 2px 4px; border-radius: 3px; font-family: monospace; font-size: 13px;">$1</code>'
			);

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

		// Only add loading indicator for new user messages (not when displaying conversation history)
		if (
			className === "user-message" &&
			!document.getElementById("loading-indicator") &&
			!document.querySelector(".loading-indicator")
		) {
			console.log("➕ Adding loading indicator for new user message");

			// Create loading container
			const loadingContainer = document.createElement("div");
			loadingContainer.id = "loading-indicator";
			loadingContainer.className = "loading-indicator";
			loadingContainer.style.display = "flex";
			loadingContainer.style.alignItems = "center";
			loadingContainer.style.gap = "8px";
			loadingContainer.style.padding = "12px 16px";
			loadingContainer.style.margin = "8px 0";
			loadingContainer.style.backgroundColor = "#F5F5F5";
			loadingContainer.style.borderRadius = "12px";
			loadingContainer.style.maxWidth = "80%";
			loadingContainer.style.borderBottomLeftRadius = "4px";

			// Create loading text
			const loadingText = document.createElement("span");
			loadingText.textContent = "Assistant is thinking";
			loadingText.style.fontSize = "14px";
			loadingText.style.color = "#757575";
			loadingText.style.fontStyle = "italic";

			// Create loading dots container
			const dotsContainer = document.createElement("div");
			dotsContainer.className = "loading-dots";
			dotsContainer.style.display = "flex";
			dotsContainer.style.gap = "4px";
			dotsContainer.style.alignItems = "center";

			// Create three dots
			for (let i = 0; i < 3; i++) {
				const dot = document.createElement("div");
				dot.className = "loading-dot";
				dot.style.width = "6px";
				dot.style.height = "6px";
				dot.style.borderRadius = "50%";
				dot.style.backgroundColor = "#2196F3";
				dot.style.animation = `loadingPulse 1.4s ease-in-out infinite both`;
				dot.style.animationDelay = `${i * 0.2}s`;
				dotsContainer.appendChild(dot);
			}

			// Add CSS animation for the dots
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

			// Assemble the loading indicator
			loadingContainer.appendChild(loadingText);
			loadingContainer.appendChild(dotsContainer);
			chatContainer.appendChild(loadingContainer);
		} else if (className === "user-message") {
			console.log("⚠️ Skipping loading indicator - conditions not met:");
			console.log(
				"  - className is user-message:",
				className === "user-message"
			);
			console.log(
				"  - loading indicator exists:",
				!!document.getElementById("loading-indicator") ||
					!!document.querySelector(".loading-indicator")
			);
		}

		chatContainer.scrollTop = chatContainer.scrollHeight;
	}

	// Function to display images in the chat interface
	function displayImage(imageUrl, className) {
		// Check if chat container exists
		const chatContainer = document.getElementById("chat-container");
		if (!chatContainer) {
			console.log("❌ Chat container not found, cannot display image");
			return;
		}

		// Create image container
		const imageContainer = document.createElement("div");
		imageContainer.className = className;
		imageContainer.style.padding = "12px 16px";
		imageContainer.style.borderRadius = "12px";
		imageContainer.style.marginBottom = "12px";
		imageContainer.style.maxWidth = "80%";
		imageContainer.style.boxShadow = "0 1px 2px rgba(0,0,0,0.1)";

		if (className === "user-message") {
			imageContainer.style.backgroundColor = "#E3F2FD";
			imageContainer.style.marginLeft = "auto";
			imageContainer.style.borderBottomRightRadius = "4px";
		} else {
			imageContainer.style.backgroundColor = "#F5F5F5";
			imageContainer.style.marginRight = "auto";
			imageContainer.style.borderBottomLeftRadius = "4px";
		}

		// Create image element
		const imageElement = document.createElement("img");
		imageElement.src = imageUrl;
		imageElement.style.maxWidth = "100%";
		imageElement.style.height = "auto";
		imageElement.style.borderRadius = "8px";
		imageElement.style.boxShadow = "0 2px 8px rgba(0,0,0,0.1)";
		imageElement.style.display = "block";
		imageElement.style.margin = "0 auto";

		// Add loading state
		imageElement.style.opacity = "0.7";
		imageElement.style.transition = "opacity 0.3s ease";

		// Handle image load success
		imageElement.onload = function () {
			this.style.opacity = "1";
			console.log("✅ Image loaded successfully:", imageUrl);
		};

		// Handle image load error
		imageElement.onerror = function () {
			console.error("❌ Failed to load image:", imageUrl);
			this.style.display = "none";

			// Create error message
			const errorMessage = document.createElement("div");
			errorMessage.style.color = "#d32f2f";
			errorMessage.style.fontSize = "14px";
			errorMessage.style.fontStyle = "italic";
			errorMessage.style.textAlign = "center";
			errorMessage.style.padding = "20px";
			errorMessage.textContent = "Failed to load image";
			imageContainer.appendChild(errorMessage);
		};

		// Add click to expand functionality
		imageElement.style.cursor = "pointer";
		imageElement.title = "Click to view full size";
		imageElement.onclick = function () {
			openImageModal(imageUrl);
		};

		// Add image to container
		imageContainer.appendChild(imageElement);

		// Add to chat container
		chatContainer.appendChild(imageContainer);
		chatContainer.scrollTop = chatContainer.scrollHeight;
	}

	// Function to open image in modal for full-size viewing
	function openImageModal(imageUrl) {
		// Remove existing modal if any
		const existingModal = document.getElementById("image-modal");
		if (existingModal) {
			existingModal.remove();
		}

		// Create modal overlay
		const modal = document.createElement("div");
		modal.id = "image-modal";
		modal.style.position = "fixed";
		modal.style.top = "0";
		modal.style.left = "0";
		modal.style.width = "100%";
		modal.style.height = "100%";
		modal.style.backgroundColor = "rgba(0, 0, 0, 0.8)";
		modal.style.display = "flex";
		modal.style.justifyContent = "center";
		modal.style.alignItems = "center";
		modal.style.zIndex = "10000";
		modal.style.cursor = "pointer";

		// Create modal content
		const modalContent = document.createElement("div");
		modalContent.style.position = "relative";
		modalContent.style.maxWidth = "90%";
		modalContent.style.maxHeight = "90%";
		modalContent.style.cursor = "default";

		// Create close button
		const closeButton = document.createElement("button");
		closeButton.innerHTML = "×";
		closeButton.style.position = "absolute";
		closeButton.style.top = "-40px";
		closeButton.style.right = "0";
		closeButton.style.background = "none";
		closeButton.style.border = "none";
		closeButton.style.color = "white";
		closeButton.style.fontSize = "30px";
		closeButton.style.cursor = "pointer";
		closeButton.style.padding = "5px 10px";
		closeButton.style.borderRadius = "5px";
		closeButton.style.transition = "background-color 0.2s";

		closeButton.onmouseover = function () {
			this.style.backgroundColor = "rgba(255, 255, 255, 0.1)";
		};
		closeButton.onmouseout = function () {
			this.style.backgroundColor = "transparent";
		};

		// Create full-size image
		const fullImage = document.createElement("img");
		fullImage.src = imageUrl;
		fullImage.style.maxWidth = "100%";
		fullImage.style.maxHeight = "100%";
		fullImage.style.objectFit = "contain";
		fullImage.style.borderRadius = "8px";
		fullImage.style.boxShadow = "0 4px 20px rgba(0,0,0,0.3)";

		// Add event listeners
		closeButton.onclick = function (e) {
			e.stopPropagation();
			modal.remove();
		};
		modal.onclick = function () {
			modal.remove();
		};
		modalContent.onclick = function (e) {
			e.stopPropagation();
		};

		// Assemble modal
		modalContent.appendChild(closeButton);
		modalContent.appendChild(fullImage);
		modal.appendChild(modalContent);

		// Add to document
		document.body.appendChild(modal);

		// Add keyboard support
		const handleKeyPress = function (e) {
			if (e.key === "Escape") {
				modal.remove();
				document.removeEventListener("keydown", handleKeyPress);
			}
		};
		document.addEventListener("keydown", handleKeyPress);
	}

	// ✅ Add event listener properly closed
	// Only add event listener if chat interface exists
	const inputBox = document.getElementById("user-input");
	if (inputBox) {
		inputBox.addEventListener("keypress", function (event) {
			if (event.key === "Enter") {
				event.preventDefault();
				sendMessage();
			}
		});
	}

	// Add the toggle function to the global scope
	window.toggleCode = function (codeId) {
		const codeElement = document.getElementById(codeId);
		const button = codeElement.previousElementSibling;

		if (codeElement.style.display === "none") {
			codeElement.style.display = "block";
			button.innerHTML = "📄 Hide Code";
		} else {
			codeElement.style.display = "none";
			button.innerHTML = "📄 Show Code";
		}
	};

	// Add test function for loading animation
	window.testLoadingAnimation = function () {
		const chatContainer = document.getElementById("chat-container");
		if (!chatContainer) {
			console.log("❌ Chat container not found");
			return;
		}

		// Remove any existing loading indicator
		const existingLoading = chatContainer.querySelector(
			"#loading-indicator, .loading-indicator"
		);
		if (existingLoading) {
			existingLoading.remove();
		}

		// Create loading container
		const loadingContainer = document.createElement("div");
		loadingContainer.id = "loading-indicator";
		loadingContainer.className = "loading-indicator";
		loadingContainer.style.display = "flex";
		loadingContainer.style.alignItems = "center";
		loadingContainer.style.gap = "8px";
		loadingContainer.style.padding = "12px 16px";
		loadingContainer.style.margin = "8px 0";
		loadingContainer.style.backgroundColor = "#F5F5F5";
		loadingContainer.style.borderRadius = "12px";
		loadingContainer.style.maxWidth = "80%";
		loadingContainer.style.borderBottomLeftRadius = "4px";

		// Create loading text
		const loadingText = document.createElement("span");
		loadingText.textContent = "Assistant is thinking";
		loadingText.style.fontSize = "14px";
		loadingText.style.color = "#757575";
		loadingText.style.fontStyle = "italic";

		// Create loading dots container
		const dotsContainer = document.createElement("div");
		dotsContainer.className = "loading-dots";
		dotsContainer.style.display = "flex";
		dotsContainer.style.gap = "4px";
		dotsContainer.style.alignItems = "center";

		// Create three dots
		for (let i = 0; i < 3; i++) {
			const dot = document.createElement("div");
			dot.className = "loading-dot";
			dot.style.width = "6px";
			dot.style.height = "6px";
			dot.style.borderRadius = "50%";
			dot.style.backgroundColor = "#2196F3";
			dot.style.animation = `loadingPulse 1.4s ease-in-out infinite both`;
			dot.style.animationDelay = `${i * 0.2}s`;
			dotsContainer.appendChild(dot);
		}

		// Add CSS animation for the dots
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

		// Assemble the loading indicator
		loadingContainer.appendChild(loadingText);
		loadingContainer.appendChild(dotsContainer);
		chatContainer.appendChild(loadingContainer);

		console.log(
			"✅ Loading animation test created! You should see animated dots."
		);
	};

	// Add test function for image display
	window.testImageDisplay = function () {
		const chatContainer = document.getElementById("chat-container");
		if (!chatContainer) {
			console.log("❌ Chat container not found");
			return;
		}

		// Test with a sample image (replace with your own test image URL)
		const testImageUrl =
			"https://via.placeholder.com/400x300/2196F3/FFFFFF?text=Test+Image";
		console.log("🖼️ Testing image display with:", testImageUrl);
		displayImage(testImageUrl, "assistant-message");
	};

	// Function to display file-based images from ChatGPT
	function displayFileImage(fileId, className) {
		// Check if chat container exists
		const chatContainer = document.getElementById("chat-container");
		if (!chatContainer) {
			console.log("❌ Chat container not found, cannot display file image");
			return;
		}

		// Create image container
		const imageContainer = document.createElement("div");
		imageContainer.className = className;
		imageContainer.style.padding = "12px 16px";
		imageContainer.style.borderRadius = "12px";
		imageContainer.style.marginBottom = "12px";
		imageContainer.style.maxWidth = "80%";
		imageContainer.style.boxShadow = "0 1px 2px rgba(0,0,0,0.1)";

		if (className === "user-message") {
			imageContainer.style.backgroundColor = "#E3F2FD";
			imageContainer.style.marginLeft = "auto";
			imageContainer.style.borderBottomRightRadius = "4px";
		} else {
			imageContainer.style.backgroundColor = "#F5F5F5";
			imageContainer.style.marginRight = "auto";
			imageContainer.style.borderBottomLeftRadius = "4px";
		}

		// Create loading indicator for file image
		const loadingDiv = document.createElement("div");
		loadingDiv.style.display = "flex";
		loadingDiv.style.alignItems = "center";
		loadingDiv.style.justifyContent = "center";
		loadingDiv.style.padding = "20px";
		loadingDiv.style.color = "#757575";
		loadingDiv.style.fontStyle = "italic";
		loadingDiv.innerHTML = `
			<div style="display: flex; align-items: center; gap: 8px;">
				<div style="width: 16px; height: 16px; border: 2px solid #e0e0e0; border-top: 2px solid #2196F3; border-radius: 50%; animation: spin 1s linear infinite;"></div>
				<span>Loading image...</span>
			</div>
		`;

		// Add spinning animation CSS
		if (!document.getElementById("spinning-animation-style")) {
			const style = document.createElement("style");
			style.id = "spinning-animation-style";
			style.textContent = `
				@keyframes spin {
					0% { transform: rotate(0deg); }
					100% { transform: rotate(360deg); }
				}
			`;
			document.head.appendChild(style);
		}

		imageContainer.appendChild(loadingDiv);
		chatContainer.appendChild(imageContainer);
		chatContainer.scrollTop = chatContainer.scrollHeight;

		// First, get the image reference from the proxy
		fetch(PROXY_URL, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				path: `/files/${fileId}/content`,
				method: "GET",
			}),
		})
			.then((response) => {
				if (!response.ok) {
					throw new Error(`HTTP error! status: ${response.status}`);
				}
				return response.blob();
			})
			.then((blob) => {
				// Create object URL from blob
				const imageUrl = URL.createObjectURL(blob);
				console.log("✅ File image loaded successfully:", fileId);
				console.log("🔍 Blob details:", {
					size: blob.size,
					type: blob.type,
					url: imageUrl,
				});

				// Remove loading indicator
				loadingDiv.remove();

				// Create image element
				const imageElement = document.createElement("img");
				imageElement.src = imageUrl;
				imageElement.style.maxWidth = "100%";
				imageElement.style.height = "auto";
				imageElement.style.borderRadius = "8px";
				imageElement.style.boxShadow = "0 2px 8px rgba(0,0,0,0.1)";
				imageElement.style.display = "block";
				imageElement.style.margin = "0 auto";

				// Add loading state
				imageElement.style.opacity = "0.7";
				imageElement.style.transition = "opacity 0.3s ease";

				// Handle image load success
				imageElement.onload = function () {
					this.style.opacity = "1";
					console.log("✅ File image rendered successfully");
				};

				// Handle image load error
				imageElement.onerror = function () {
					console.error("❌ Failed to render file image:", fileId);
					console.error("🔍 Image element error details:", {
						src: this.src,
						naturalWidth: this.naturalWidth,
						naturalHeight: this.naturalHeight,
						complete: this.complete,
					});
					this.style.display = "none";

					// Create error message
					const errorMessage = document.createElement("div");
					errorMessage.style.color = "#d32f2f";
					errorMessage.style.fontSize = "14px";
					errorMessage.style.fontStyle = "italic";
					errorMessage.style.textAlign = "center";
					errorMessage.style.padding = "20px";
					errorMessage.textContent = "Failed to load image";
					imageContainer.appendChild(errorMessage);
				};

				// Add click to expand functionality
				imageElement.style.cursor = "pointer";
				imageElement.title = "Click to view full size";
				imageElement.onclick = function () {
					openImageModal(imageUrl);
				};

				// Add image to container
				imageContainer.appendChild(imageElement);

				// Clean up object URL when image is removed
				imageElement.addEventListener("load", function () {
					// Store the object URL for cleanup
					imageElement.dataset.objectUrl = imageUrl;
				});
			})
			.catch((error) => {
				console.error("❌ Error fetching file image:", error);
				loadingDiv.innerHTML = `
					<div style="color: #d32f2f; font-size: 14px; font-style: italic; text-align: center;">
						Failed to load image: ${error.message}
					</div>
				`;
			});
	}

	// Add test function for file-based image display
	window.testFileImageDisplay = function (fileId = "file-abc123") {
		const chatContainer = document.getElementById("chat-container");
		if (!chatContainer) {
			console.log("❌ Chat container not found");
			return;
		}

		console.log("🖼️ Testing file image display with file ID:", fileId);
		displayFileImage(fileId, "assistant-message");
	};

	// Add debug function to test file retrieval
	window.debugFileRetrieval = function (fileId = "file-abc123") {
		console.log("🔍 Debugging file retrieval for:", fileId);

		fetch(PROXY_URL, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				path: `/files/${fileId}/content`,
				method: "GET",
			}),
		})
			.then((response) => {
				console.log("🔍 Response status:", response.status);
				console.log("🔍 Response headers:", response.headers);
				console.log("🔍 Response ok:", response.ok);

				if (!response.ok) {
					return response.text().then((text) => {
						console.error("🔍 Error response body:", text);
						throw new Error(
							`HTTP error! status: ${response.status}, body: ${text}`
						);
					});
				}

				return response.arrayBuffer();
			})
			.then((buffer) => {
				console.log("🔍 Success! Received buffer of size:", buffer.byteLength);
				console.log("🔍 Buffer type:", typeof buffer);
				console.log("🔍 Buffer constructor:", buffer.constructor.name);
			})
			.catch((error) => {
				console.error("🔍 File retrieval failed:", error);
			});
	};

	// Add simple proxy test function
	window.testProxyConnection = function () {
		console.log("🔍 Testing proxy connection...");

		fetch(PROXY_URL, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				path: "/models",
				method: "GET",
			}),
		})
			.then((response) => {
				console.log("🔍 Proxy test response:");
				console.log("  - Status:", response.status);
				console.log("  - OK:", response.ok);

				if (!response.ok) {
					return response.text().then((text) => {
						console.error("🔍 Proxy test error body:", text);
						throw new Error(`Proxy test failed: ${response.status}`);
					});
				}

				return response.json();
			})
			.then((data) => {
				console.log("🔍 Proxy test successful!");
				console.log("🔍 Response data:", data);
			})
			.catch((error) => {
				console.error("🔍 Proxy test failed:", error);
			});
	};

	// Add this function at top-level in the DOMContentLoaded block
	function renderMCQ(problemId) {
		const container = document.getElementById("mcq-container");
		if (!container) return;
		container.innerHTML = "";
		if (problemId === null || problemId === undefined || isNaN(problemId)) {
			container.style.display = "none";
			return;
		}
		container.style.display = "";
		const correct = answerKey[problemId];

		// Check if we have an answer for this problem
		if (correct === undefined) {
			console.warn("No answer found for problem", problemId);
			container.style.display = "none";
			return;
		}

		// Build MCQ UI
		const question = document.createElement("div");
		question.style.margin = "24px 0 8px 0";
		question.style.fontWeight = "600";
		question.style.fontSize = "16px";
		question.textContent = "Does this person earn more than 50k?";
		container.appendChild(question);

		const form = document.createElement("form");
		form.style.display = "flex";
		form.style.gap = "18px";
		form.style.alignItems = "center";
		form.onsubmit = function (e) {
			e.preventDefault();
		};

		const yesLabel = document.createElement("label");
		yesLabel.style.display = "flex";
		yesLabel.style.alignItems = "center";
		const yesRadio = document.createElement("input");
		yesRadio.type = "radio";
		yesRadio.name = "mcq";
		yesRadio.value = "1";
		yesLabel.appendChild(yesRadio);
		yesLabel.appendChild(document.createTextNode(" Yes"));

		const noLabel = document.createElement("label");
		noLabel.style.display = "flex";
		noLabel.style.alignItems = "center";
		const noRadio = document.createElement("input");
		noRadio.type = "radio";
		noRadio.name = "mcq";
		noRadio.value = "0";
		noLabel.appendChild(noRadio);
		noLabel.appendChild(document.createTextNode(" No"));

		form.appendChild(yesLabel);
		form.appendChild(noLabel);

		const submitBtn = document.createElement("button");
		submitBtn.type = "button";
		submitBtn.textContent = "Submit";
		submitBtn.style.marginLeft = "16px";
		submitBtn.style.padding = "6px 18px";
		submitBtn.style.background = "#1976D2";
		submitBtn.style.color = "#fff";
		submitBtn.style.border = "none";
		submitBtn.style.borderRadius = "6px";
		submitBtn.style.fontWeight = "600";
		submitBtn.style.cursor = "pointer";
		form.appendChild(submitBtn);

		container.appendChild(form);

		const feedback = document.createElement("div");
		feedback.style.marginTop = "12px";
		feedback.style.fontSize = "15px";
		feedback.style.fontWeight = "500";
		container.appendChild(feedback);

		submitBtn.onclick = function () {
			const selected = form.querySelector('input[name="mcq"]:checked');
			if (!selected) {
				feedback.textContent = "Please select an answer.";
				feedback.style.color = "#d32f2f";
				return;
			}
			const userAnswer = parseInt(selected.value);
			if (userAnswer === correct) {
				feedback.textContent = "✅ Correct!";
				feedback.style.color = "#388e3c";
			} else {
				feedback.textContent = `❌ Incorrect. The correct answer is: ${
					correct ? "Yes" : "No"
				}`;
				feedback.style.color = "#d32f2f";
			}
			// Disable further changes
			yesRadio.disabled = true;
			noRadio.disabled = true;
			submitBtn.disabled = true;
		};
	}

	// Populate type selector dropdown (only visible in View 3)
	function populateTypeSelector() {
		let selector = document.getElementById("type-selector");

		// Check if element exists
		if (!selector) {
			console.log(
				"Type selector element not found, checking if it was replaced..."
			);

			// Check if there's a button container that replaced it
			const buttonContainer = document.getElementById("type-selector-buttons");
			if (buttonContainer) {
				console.log("Found button container, using it as selector");
				selector = buttonContainer;
			} else {
				console.log("No button container found, creating new type selector");
				// Create the type selector if it doesn't exist
				const selectorGroup = document.querySelector(
					".selector-group:nth-child(2)"
				);
				if (selectorGroup) {
					selector = document.createElement("select");
					selector.id = "type-selector";
					selector.innerHTML =
						'<option value="">Select a person first...</option>';
					selector.style.cssText = `
						padding: 10px 15px;
						border: 2px solid #e0e0e0;
						border-radius: 8px;
						font-size: 14px;
						background: white;
						color: #333;
						cursor: pointer;
						min-width: 200px;
						transition: border-color 0.3s ease;
					`;
					selectorGroup.appendChild(selector);
					console.log("Created new type selector element");
				} else {
					console.log("Could not find selector group to add type selector");
					return;
				}
			}
		}

		console.log(
			"Populating type selector for view:",
			currentView,
			"problemId:",
			currentProblemId
		);

		if (!currentProblemId) {
			if (selector.tagName === "SELECT") {
				selector.innerHTML =
					'<option value="">Select a person first...</option>';
			}
			return;
		}

		// Only show type selector in View 3 (chat view)
		if (currentView === 3) {
			console.log("Creating buttons for View 3");

			// Create a new div to replace the select element
			const buttonContainer = document.createElement("div");
			buttonContainer.id = "type-selector-buttons";
			buttonContainer.style.cssText = `
				display: flex;
				gap: 10px;
				justify-content: center;
				align-items: center;
				min-height: 40px;
				min-width: 200px;
			`;

			// Create Normal Questions button
			const normalBtn = document.createElement("button");
			normalBtn.id = "normal-questions-btn";
			normalBtn.className = "type-button active";
			normalBtn.textContent = "Normal Questions";
			normalBtn.style.cssText = `
				padding: 8px 16px;
				border: 2px solid #2196f3;
				background: #2196f3;
				color: white;
				border-radius: 6px;
				cursor: pointer;
				font-size: 14px;
				font-weight: 500;
				transition: all 0.3s ease;
			`;

			// Create Feature Questions button
			const featureBtn = document.createElement("button");
			featureBtn.id = "feature-questions-btn";
			featureBtn.className = "type-button";
			featureBtn.textContent = "Feature Questions";
			featureBtn.style.cssText = `
				padding: 8px 16px;
				border: 2px solid #e0e0e0;
				background: white;
				color: #666;
				border-radius: 6px;
				cursor: pointer;
				font-size: 14px;
				font-weight: 500;
				transition: all 0.3s ease;
			`;

			// Add buttons to the container
			buttonContainer.appendChild(normalBtn);
			buttonContainer.appendChild(featureBtn);

			// Replace the select element with the button container
			selector.parentNode.replaceChild(buttonContainer, selector);
			console.log("Replaced select with button container");

			// Add event listeners for buttons
			normalBtn.addEventListener("click", function () {
				console.log("Normal Questions button clicked");
				// Update button states
				normalBtn.classList.add("active");
				normalBtn.style.background = "#2196f3";
				normalBtn.style.color = "white";
				normalBtn.style.borderColor = "#2196f3";

				featureBtn.classList.remove("active");
				featureBtn.style.background = "white";
				featureBtn.style.color = "#666";
				featureBtn.style.borderColor = "#e0e0e0";

				currentType = "normal";

				// Remove feature selector if it exists
				const featureSelector = document.getElementById(
					"inline-feature-selector"
				);
				if (featureSelector && featureSelector.parentElement) {
					featureSelector.parentElement.remove();
				}

				// Restore original question pool
				restoreOriginalQuestionPool();
			});

			featureBtn.addEventListener("click", function () {
				console.log("Feature Questions button clicked");
				// Update button states
				featureBtn.classList.add("active");
				featureBtn.style.background = "#2196f3";
				featureBtn.style.color = "white";
				featureBtn.style.borderColor = "#2196f3";

				normalBtn.classList.remove("active");
				normalBtn.style.background = "white";
				normalBtn.style.color = "#666";
				normalBtn.style.borderColor = "#e0e0e0";

				currentType = "feature";
				populateFeatureSelector(currentProblemId);
			});

			// Auto-select normal questions by default
			currentType = "normal";
		} else {
			console.log("Restoring select for Views 1/2");
			// For Views 1 and 2, restore the original select element
			const buttonContainer = document.getElementById("type-selector-buttons");
			if (buttonContainer) {
				// Recreate the original select element
				const newSelector = document.createElement("select");
				newSelector.id = "type-selector";
				newSelector.innerHTML =
					'<option value="">Select a person first...</option>';
				newSelector.style.cssText = `
					padding: 10px 15px;
					border: 2px solid #e0e0e0;
					border-radius: 8px;
					font-size: 14px;
					background: white;
					color: #333;
					cursor: pointer;
					min-width: 200px;
					transition: border-color 0.3s ease;
				`;
				buttonContainer.parentNode.replaceChild(newSelector, buttonContainer);
				console.log("Restored select element");
			}
			currentType = null;
		}
	}

	// Populate feature selector (appears when "Feature Questions" is selected)
	function populateFeatureSelector(problemId) {
		// Create feature selector above the questions
		createFeatureSelectorAboveQuestions(problemId);
	}

	// Create feature selector above the questions
	function createFeatureSelectorAboveQuestions(problemId) {
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
			if (selectedFeature && currentProblemId) {
				loadFeatureQuestion(currentProblemId, selectedFeature);
			}
		});

		// Auto-select first feature
		if (FEATURES.length > 0) {
			featureSelector.value = FEATURES[0];
			loadFeatureQuestion(problemId, FEATURES[0]);
		}
	}

	// Show feature selection box below chat
	function showFeatureBox(problemId) {
		// Remove existing feature box if any
		const existingBox = document.getElementById("feature-box");
		if (existingBox) {
			existingBox.remove();
		}

		// Create feature box container
		const featureBox = document.createElement("div");
		featureBox.id = "feature-box";
		featureBox.style.cssText = `
			margin-top: 15px;
			padding: 20px;
			background: #f8f9fa;
			border-radius: 8px;
			border: 1px solid #e0e0e0;
			box-shadow: 0 2px 4px rgba(0,0,0,0.1);
		`;

		// Create header
		const header = document.createElement("div");
		header.style.cssText = `
			display: flex;
			justify-content: space-between;
			align-items: center;
			margin-bottom: 16px;
			padding-bottom: 8px;
			border-bottom: 1px solid #e0e0e0;
		`;

		const title = document.createElement("h4");
		title.textContent = "Feature Questions";
		title.style.cssText = `
			margin: 0;
			color: #1565c0;
			font-size: 16px;
			font-weight: 600;
		`;

		const closeButton = document.createElement("button");
		closeButton.innerHTML = "×";
		closeButton.style.cssText = `
			background: none;
			border: none;
			font-size: 18px;
			cursor: pointer;
			color: #666;
			padding: 0;
			width: 24px;
			height: 24px;
			display: flex;
			align-items: center;
			justify-content: center;
			border-radius: 50%;
			transition: background-color 0.2s;
		`;

		closeButton.addEventListener("mouseover", function () {
			this.style.backgroundColor = "#e0e0e0";
		});
		closeButton.addEventListener("mouseout", function () {
			this.style.backgroundColor = "transparent";
		});

		closeButton.addEventListener("click", function () {
			featureBox.remove();
			// Switch back to normal questions
			currentType = "normal";
			restoreOriginalQuestionPool();
		});

		header.appendChild(title);
		header.appendChild(closeButton);

		// Create feature selector section
		const featureSection = document.createElement("div");
		featureSection.style.cssText = `
			margin-bottom: 16px;
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

		featureSection.appendChild(featureLabel);
		featureSection.appendChild(featureSelector);

		// Create suggested questions section
		const questionsSection = document.createElement("div");
		questionsSection.style.cssText = `
			margin-bottom: 12px;
		`;

		const questionsLabel = document.createElement("h5");
		questionsLabel.textContent = "Suggested Questions:";
		questionsLabel.style.cssText = `
			margin: 0 0 8px 0;
			color: #333;
			font-size: 14px;
			font-weight: 500;
		`;

		const questionsContainer = document.createElement("div");
		questionsContainer.id = "inline-questions-container";
		questionsContainer.style.cssText = `
			display: flex;
			flex-direction: column;
			gap: 6px;
		`;

		// Add placeholder text
		const placeholder = document.createElement("div");
		placeholder.textContent = "Select a feature to see suggested questions";
		placeholder.style.cssText = `
			color: #666;
			font-style: italic;
			text-align: center;
			padding: 12px;
			font-size: 13px;
		`;
		questionsContainer.appendChild(placeholder);

		questionsSection.appendChild(questionsLabel);
		questionsSection.appendChild(questionsContainer);

		// Add event listener for feature selection
		featureSelector.addEventListener("change", function () {
			const selectedFeature = this.value;
			if (selectedFeature && currentProblemId) {
				updateInlineQuestions(selectedFeature, problemId);
			} else {
				// Show placeholder
				questionsContainer.innerHTML = "";
				const placeholder = document.createElement("div");
				placeholder.textContent = "Select a feature to see suggested questions";
				placeholder.style.cssText = `
					color: #666;
					font-style: italic;
					text-align: center;
					padding: 12px;
					font-size: 13px;
				`;
				questionsContainer.appendChild(placeholder);
			}
		});

		// Assemble feature box
		featureBox.appendChild(header);
		featureBox.appendChild(featureSection);
		featureBox.appendChild(questionsSection);

		// Add to the right panel after the quick questions container
		const rightPanel = document.getElementById("right-panel");
		if (rightPanel) {
			rightPanel.appendChild(featureBox);
		}
	}

	// Update inline questions based on selected feature
	function updateInlineQuestions(featureName, problemId) {
		const questions = questionsData.filter((q) => q.problem == problemId);
		if (questions.length === 0) return;

		// Use the first question to get the data dictionary
		const question = questions[0];
		const dataDict = parseDictString(question.dict);
		const featureValue = dataDict[featureName];

		if (featureValue === undefined) {
			console.error("Feature not found:", featureName);
			return;
		}

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

		// Get the feature-specific questions
		const featureQuestions = featureQuestionPools[featureName] || [
			`How does this person's ${featureName} of ${featureValue} affect their income?`,
			`What are the implications of ${featureName}: ${featureValue} for income?`,
			`How might ${featureName} influence this person's earning potential?`,
		];

		// Update the questions container
		const questionsContainer = document.getElementById(
			"inline-questions-container"
		);
		if (questionsContainer) {
			questionsContainer.innerHTML = "";

			// Add feature-specific questions
			featureQuestions.forEach((question) => {
				const questionButton = document.createElement("button");
				questionButton.textContent = question;
				questionButton.style.cssText = `
					padding: 8px 10px;
					background: #ffffff;
					border: 1px solid #e0e0e0;
					border-radius: 4px;
					cursor: pointer;
					font-size: 12px;
					color: #1976D2;
					text-align: left;
					transition: all 0.2s ease;
					white-space: normal;
					word-wrap: break-word;
					line-height: 1.3;
				`;

				// Add hover effects
				questionButton.addEventListener("mouseover", function () {
					this.style.backgroundColor = "#E3F2FD";
					this.style.borderColor = "#2196F3";
				});
				questionButton.addEventListener("mouseout", function () {
					this.style.backgroundColor = "#ffffff";
					this.style.borderColor = "#e0e0e0";
				});

				// Add click handler to copy question to chat
				questionButton.addEventListener("click", function () {
					const inputBox = document.getElementById("user-input");
					if (inputBox) {
						inputBox.value = this.textContent;
						sendMessage();
					}
				});

				questionsContainer.appendChild(questionButton);
			});
		}
	}

	// Load and display feature question data
	function loadFeatureQuestion(problemId, featureName) {
		const questions = questionsData.filter((q) => q.problem == problemId);
		if (questions.length === 0) return;

		// Use the first question to get the data dictionary
		const question = questions[0];
		currentQuestionData = question;

		try {
			const dataDict = parseDictString(question.dict);

			// Get the specific feature value
			const featureValue = dataDict[featureName];
			if (featureValue === undefined) {
				console.error("Feature not found:", featureName);
				return;
			}

			// Update the question pool in the chat interface to feature-specific questions
			updateChatQuestionPool(featureName, featureValue);

			// Reset chat thread when new feature is selected
			threadId = null;

			console.log(
				"Updated chat question pool for problem",
				problemId,
				"with feature:",
				featureName,
				"value:",
				featureValue
			);
		} catch (error) {
			console.error("Error parsing feature question data:", error);
		}
	}

	// Update the chat question pool to feature-specific questions
	function updateChatQuestionPool(featureName, featureValue) {
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

			// Add click handler for feature refresh
			refreshButton.addEventListener("click", function () {
				refreshFeatureQuestions(featureName, featureValue);
			});

			refreshContainer.appendChild(refreshButton);
			quickQuestionsContainer.appendChild(refreshContainer);
		}

		console.log(`Updated chat question pool for feature: ${featureName}`);
	}

	// Refresh feature questions with new random selections
	function refreshFeatureQuestions(featureName, featureValue) {
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

		// Get the feature-specific questions
		const featureQuestions = featureQuestionPools[featureName] || [
			`How does this person's ${featureName} of ${featureValue} affect their income?`,
			`What are the implications of ${featureName}: ${featureValue} for income?`,
			`How might ${featureName} influence this person's earning potential?`,
		];

		// Shuffle the questions and pick 3 random ones
		const shuffledQuestions = [...featureQuestions].sort(
			() => Math.random() - 0.5
		);
		const selectedQuestions = shuffledQuestions.slice(0, 3);

		// Update the quick questions in the chat interface
		const quickQuestionsContainer = document.querySelector(
			".quick-questions-container"
		);
		if (quickQuestionsContainer) {
			// Store the refresh button if it exists
			const refreshContainer =
				quickQuestionsContainer.querySelector("div:first-child");

			// Clear existing questions but preserve refresh button
			quickQuestionsContainer.innerHTML = "";

			// Restore refresh button if it existed
			if (refreshContainer) {
				quickQuestionsContainer.appendChild(refreshContainer);
			}

			// Add new random feature questions
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
		}

		console.log(`Refreshed feature questions for: ${featureName}`);
	}

	// Update the data table for feature questions
	function updateFeatureTable(featureName, featureValue) {
		const table = document.getElementById("table");
		const tbody = table.querySelector("tbody");

		// Clear existing rows except header
		const headerRow = tbody.querySelector("tr");
		tbody.innerHTML = "";
		tbody.appendChild(headerRow);

		// Add single row for the selected feature
		const row = document.createElement("tr");
		const labelCell = document.createElement("td");
		const valueCell = document.createElement("td");

		labelCell.textContent = featureName;
		valueCell.textContent = featureValue;

		row.appendChild(labelCell);
		row.appendChild(valueCell);
		tbody.appendChild(row);
	}

	// Update the summary for feature questions
	function updateFeatureSummary(featureName, featureValue) {
		const summaryElement = document.querySelector(
			"#llm-summary .income-predictor-summary-content"
		);
		if (summaryElement) {
			summaryElement.textContent = `This person's ${featureName} is: ${featureValue}`;
		}
	}

	// Add test function for debugging type selector
	window.testTypeSelector = function () {
		console.log("Testing type selector...");
		console.log("Current view:", currentView);
		console.log("Current problem ID:", currentProblemId);
		populateTypeSelector();
	};

	// Add test function for switching to View 3
	window.testView3 = function () {
		console.log("Switching to View 3...");
		selectView(3);
	};

	// Add comprehensive debug function
	window.debugElements = function () {
		console.log("=== DEBUGGING ELEMENTS ===");
		console.log(
			"All selector groups:",
			document.querySelectorAll(".selector-group")
		);
		console.log("Type selector:", document.getElementById("type-selector"));
		console.log(
			"Question selector:",
			document.getElementById("question-selector")
		);
		console.log(
			"Summary selector:",
			document.getElementById("summary-selector")
		);
		console.log("Current view:", currentView);
		console.log("Current problem ID:", currentProblemId);

		// Check if type selector exists in different ways
		const byId = document.getElementById("type-selector");
		const byQuery = document.querySelector("#type-selector");
		const byTag = document.querySelector("select#type-selector");

		console.log("Type selector by ID:", byId);
		console.log("Type selector by query:", byQuery);
		console.log("Type selector by tag:", byTag);

		// Check the second selector group specifically
		const secondGroup = document.querySelector(".selector-group:nth-child(2)");
		console.log("Second selector group:", secondGroup);
		if (secondGroup) {
			console.log("Second group children:", secondGroup.children);
		}

		// Check what's inside the type selector
		const typeSelector = document.getElementById("type-selector");
		if (typeSelector) {
			console.log("Type selector innerHTML:", typeSelector.innerHTML);
			console.log("Type selector children:", typeSelector.children);
			console.log("Type selector childNodes:", typeSelector.childNodes);

			// Check for buttons specifically
			const normalBtn = document.getElementById("normal-questions-btn");
			const featureBtn = document.getElementById("feature-questions-btn");
			console.log("Normal button:", normalBtn);
			console.log("Feature button:", featureBtn);

			// Check computed styles
			console.log(
				"Type selector computed display:",
				window.getComputedStyle(typeSelector).display
			);
			console.log(
				"Type selector computed visibility:",
				window.getComputedStyle(typeSelector).visibility
			);
			console.log(
				"Type selector computed opacity:",
				window.getComputedStyle(typeSelector).opacity
			);
		}
	};

	// Add test function to make buttons more visible
	window.testButtons = function () {
		const normalBtn = document.getElementById("normal-questions-btn");
		const featureBtn = document.getElementById("feature-questions-btn");

		if (normalBtn && featureBtn) {
			console.log("Buttons found! Making them more visible...");

			// Make buttons more prominent
			normalBtn.style.cssText = `
				padding: 12px 20px !important;
				border: 3px solid #ff0000 !important;
				background: #ff0000 !important;
				color: white !important;
				border-radius: 8px !important;
				cursor: pointer !important;
				font-size: 16px !important;
				font-weight: bold !important;
				transition: all 0.3s ease !important;
				box-shadow: 0 4px 8px rgba(0,0,0,0.3) !important;
			`;

			featureBtn.style.cssText = `
				padding: 12px 20px !important;
				border: 3px solid #00ff00 !important;
				background: #00ff00 !important;
				color: black !important;
				border-radius: 8px !important;
				cursor: pointer !important;
				font-size: 16px !important;
				font-weight: bold !important;
				transition: all 0.3s ease !important;
				box-shadow: 0 4px 8px rgba(0,0,0,0.3) !important;
			`;

			console.log("Buttons should now be bright red and green!");
		} else {
			console.log("Buttons not found!");
		}
	};

	// Add function to check selector group structure
	window.checkStructure = function () {
		console.log("=== CHECKING STRUCTURE ===");

		const selectorGroups = document.querySelectorAll(".selector-group");
		console.log("Number of selector groups:", selectorGroups.length);

		selectorGroups.forEach((group, index) => {
			console.log(`Group ${index + 1}:`, group);
			console.log(`Group ${index + 1} children:`, group.children);

			// Check each child
			Array.from(group.children).forEach((child, childIndex) => {
				console.log(
					`  Child ${childIndex + 1}:`,
					child.tagName,
					child.id || child.className
				);
			});
		});

		// Check where the type selector actually is
		const typeSelector = document.getElementById("type-selector");
		if (typeSelector) {
			console.log("Type selector parent:", typeSelector.parentElement);
			console.log(
				"Type selector parent class:",
				typeSelector.parentElement?.className
			);
			console.log(
				"Type selector position in parent:",
				Array.from(typeSelector.parentElement?.children || []).indexOf(
					typeSelector
				)
			);
		}
	};

	// Restore the original question pool
	function restoreOriginalQuestionPool() {
		// Update the quick questions in the chat interface
		const quickQuestionsContainer = document.querySelector(
			".quick-questions-container"
		);
		if (quickQuestionsContainer) {
			// Store the refresh button if it exists
			const refreshContainer =
				quickQuestionsContainer.querySelector("div:last-child");

			// Clear existing questions but preserve refresh button
			quickQuestionsContainer.innerHTML = "";

			// Add original questions (first 3)
			originalQuestionPool.slice(0, 3).forEach((question) => {
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

			// Restore refresh button at the bottom if it existed
			if (refreshContainer) {
				quickQuestionsContainer.appendChild(refreshContainer);
			}
		}

		console.log("Restored original question pool");
	}

	// Refresh quick questions with new random selections
	function refreshQuickQuestions() {
		console.log("Refresh function called, current type:", currentType);

		if (currentType === "feature") {
			// For feature questions, refresh the current feature questions
			const featureSelector = document.getElementById(
				"inline-feature-selector"
			);
			if (featureSelector && featureSelector.value && currentProblemId) {
				const selectedFeature = featureSelector.value;
				const questions = questionsData.filter(
					(q) => q.problem == currentProblemId
				);
				if (questions.length > 0) {
					const question = questions[0];
					const dataDict = parseDictString(question.dict);
					const featureValue = dataDict[selectedFeature];
					if (featureValue !== undefined) {
						refreshFeatureQuestions(selectedFeature, featureValue);
						console.log("Refreshed feature-specific questions");
					}
				}
			}
		} else {
			// Refresh normal questions with random selection
			refreshNormalQuestions();
			console.log("Refreshed normal questions");
		}
	}

	// Refresh normal questions with random selection
	function refreshNormalQuestions() {
		// Shuffle the question pool and pick 3 random questions
		const shuffledQuestions = [...originalQuestionPool].sort(
			() => Math.random() - 0.5
		);
		const selectedQuestions = shuffledQuestions.slice(0, 3);

		// Update the quick questions in the chat interface
		const quickQuestionsContainer = document.querySelector(
			".quick-questions-container"
		);
		if (quickQuestionsContainer) {
			// Store the refresh button if it exists
			const refreshContainer =
				quickQuestionsContainer.querySelector("div:last-child");

			// Clear existing questions but preserve refresh button
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

			// Restore refresh button at the bottom if it existed
			if (refreshContainer) {
				quickQuestionsContainer.appendChild(refreshContainer);
			}
		}
	}

	// Add test function to manually create refresh button
	window.testRefreshButton = function () {
		console.log("Testing refresh button creation...");

		const quickQuestionsContainer = document.querySelector(
			".quick-questions-container"
		);
		console.log("Quick questions container:", quickQuestionsContainer);

		if (quickQuestionsContainer) {
			// Create refresh button container
			const refreshContainer = document.createElement("div");
			refreshContainer.style.cssText = `
				display: flex;
				justify-content: center;
				margin-bottom: 10px;
				border: 2px solid red;
			`;

			// Create refresh button
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

			// Add click handler
			refreshButton.addEventListener("click", function () {
				console.log("Refresh button clicked!");
				refreshQuickQuestions();
			});

			refreshContainer.appendChild(refreshButton);

			// Insert at the beginning of the container
			quickQuestionsContainer.insertBefore(
				refreshContainer,
				quickQuestionsContainer.firstChild
			);

			console.log("Refresh button added!");
		} else {
			console.log("Quick questions container not found!");
		}
	};
})();
