document.addEventListener("DOMContentLoaded", function () {
	console.log("DOM fully loaded");
	// Your Qualtrics setup code or DOM manipulations here
	var that = this;

	var assistantId = "asst_EIzTKoQGOwC0Oy8Vve2QoYmz";
	var threadId = null;

	// Replace all previous proxy URLs with the new production endpoint
	const PROXY_URL =
		"https://openai-proxy-874udl7oo-js06283s-projects.vercel.app/openai-proxy";

	// Global variables
	var currentView = 1;
	var questionsData = [];
	var currentQuestionData = null;
	var currentProblemId = null;

	// Load questions data from CSV
	async function loadQuestionsData() {
		try {
			const response = await fetch("questions.csv");
			const csvText = await response.text();
			const lines = csvText.split("\n");
			const headers = lines[0].split(",");

			questionsData = [];

			for (let i = 1; i < lines.length; i++) {
				if (lines[i].trim() === "") continue;

				// Parse CSV line (handling quoted fields)
				const values = parseCSVLine(lines[i]);
				if (values.length >= 4) {
					const question = {
						dict: values[0],
						problem: parseInt(values[1]),
						name: values[2],
						summary: values[3],
					};
					questionsData.push(question);

					// Debug: Log person 19 specifically
					if (question.problem === 19) {
						console.log("Found person 19:", question);
					}
				}
			}

			console.log("Loaded questions data:", questionsData.length, "questions");

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
				populateSummarySelector(selectedProblemId);
				loadQuestionData(selectedProblemId);
			} else {
				currentProblemId = null;
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
	};

	// Function to create chat interface
	function createChatInterface() {
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
		chatContainer.style.height = "350px";
		chatContainer.style.overflowY = "scroll";
		chatContainer.style.border = "1px solid #e0e0e0";
		chatContainer.style.borderRadius = "12px";
		chatContainer.style.padding = "20px";
		chatContainer.style.backgroundColor = "#ffffff";
		chatContainer.style.boxShadow = "0 1px 3px rgba(0,0,0,0.1)";
		chatContainer.style.marginBottom = "15px";
		chatContainer.style.width = "100%";

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

		// Find the right panel and add the chat interface
		var rightPanel = document.getElementById("right-panel");
		rightPanel.appendChild(chatHeader);
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
										`📝 Displaying assistant content: ${contentItem.text.value.substring(
											0,
											50
										)}...`
									);
									displayMessage(
										"Assistant: " + contentItem.text.value,
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
});
