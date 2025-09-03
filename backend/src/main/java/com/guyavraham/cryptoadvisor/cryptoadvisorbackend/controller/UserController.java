package com.guyavraham.cryptoadvisor.cryptoadvisorbackend.controller;

import com.guyavraham.cryptoadvisor.cryptoadvisorbackend.model.User;
import com.guyavraham.cryptoadvisor.cryptoadvisorbackend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.client.RestClientException;
import com.guyavraham.cryptoadvisor.cryptoadvisorbackend.model.Feedback;
import com.guyavraham.cryptoadvisor.cryptoadvisorbackend.repository.FeedbackRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.List;
import java.util.HashSet;
import java.util.Arrays;
import java.util.ArrayList;
import java.time.Instant;
import java.time.LocalDateTime;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "http://localhost:3000")
public class UserController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private FeedbackRepository feedbackRepository;

    @Value("${cryptopanic.api.key:263d57182fcdae784f08194e141971120e959e84}")
    private String cryptoPanicApiKey;

    @Value("${openrouter.api.key:your-openrouter-key-here}")
    private String openRouterApiKey;

    @Value("${reddit.client.id:your-reddit-client-id}")
    private String redditClientId;

    @Value("${reddit.client.secret:your-reddit-client-secret}")
    private String redditClientSecret;

    @Value("${reddit.user.agent:CryptoAdvisor/1.0}")
    private String redditUserAgent;

    // Reddit access token cache
    private String redditAccessToken;
    private long redditTokenExpiry = 0;

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    @PostMapping("/feedback")
    public ResponseEntity<?> submitFeedback(@RequestBody FeedbackRequest request) {
        Feedback feedback = new Feedback(request.getUserId(), request.getSection(), request.getVote());
        feedbackRepository.save(feedback);

        return ResponseEntity.ok(Map.of("message", "Feedback recorded"));
    }

    @PostMapping("/article-feedback")
    public ResponseEntity<?> submitArticleFeedback(@RequestBody ArticleFeedbackRequest request) {
        // Check if user already voted on this article
        Optional<Feedback> existingFeedback = feedbackRepository
            .findByUserIdAndSectionAndArticleId(request.getUserId(), "news", request.getArticleId());

        Feedback feedback;
        if (existingFeedback.isPresent()) {
            // Update existing vote
            feedback = existingFeedback.get();
            feedback.setVote(request.getVote());
            feedback.setCreatedAt(LocalDateTime.now());
        } else {
            // Create new vote
            feedback = new Feedback(request.getUserId(), "news", request.getVote(), request.getArticleId());
        }

        feedbackRepository.save(feedback);

        Map<String, Object> response = new HashMap<>();
        response.put("message", "Article feedback recorded");
        response.put("articleId", request.getArticleId());
        response.put("vote", request.getVote());

        return ResponseEntity.ok(response);
    }

    @GetMapping("/article-feedback/{userId}")
    public ResponseEntity<?> getUserArticleVotes(@PathVariable Long userId) {
        List<Feedback> userVotes = feedbackRepository.findByUserIdAndSection(userId, "news");

        Map<String, String> votes = new HashMap<>();
        for (Feedback feedback : userVotes) {
            if (feedback.getArticleId() != null) {
                votes.put(feedback.getArticleId(), feedback.getVote());
            }
        }

        return ResponseEntity.ok(votes);
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            return ResponseEntity.badRequest()
                .body(Map.of("error", "Email already registered"));
        }

        User user = new User();
        user.setEmail(request.getEmail());
        user.setName(request.getName());
        user.setPassword(passwordEncoder.encode(request.getPassword()));

        User savedUser = userRepository.save(user);

        Map<String, Object> response = new HashMap<>();
        response.put("message", "User registered successfully");
        response.put("userId", savedUser.getId());
        response.put("email", savedUser.getEmail());
        response.put("name", savedUser.getName());

        return ResponseEntity.ok(response);
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request) {
        Optional<User> userOpt = userRepository.findByEmail(request.getEmail());

        if (userOpt.isEmpty()) {
            return ResponseEntity.badRequest()
                .body(Map.of("error", "Invalid email or password"));
        }

        User user = userOpt.get();

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            return ResponseEntity.badRequest()
                .body(Map.of("error", "Invalid email or password"));
        }

        Map<String, Object> response = new HashMap<>();
        response.put("message", "Login successful");
        response.put("userId", user.getId());
        response.put("email", user.getEmail());
        response.put("name", user.getName());
        response.put("onboardingCompleted", user.getOnboardingCompleted());

        return ResponseEntity.ok(response);
    }

    @PutMapping("/onboarding/{userId}")
    public ResponseEntity<?> updateOnboarding(@PathVariable Long userId, @RequestBody OnboardingRequest request) {
        Optional<User> userOpt = userRepository.findById(userId);

        if (userOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        User user = userOpt.get();
        user.setCryptoInterests(new HashSet<>(request.getCryptoInterests()));
        user.setInvestorType(request.getInvestorType());
        user.setContentPreferences(new HashSet<>(request.getContentPreferences()));
        user.setOnboardingCompleted(true);

        User savedUser = userRepository.save(user);

        Map<String, Object> response = new HashMap<>();
        response.put("message", "Onboarding completed");
        response.put("userId", savedUser.getId());
        response.put("name", savedUser.getName());
        response.put("email", savedUser.getEmail());
        response.put("onboardingCompleted", savedUser.getOnboardingCompleted());

        return ResponseEntity.ok(response);
    }

    @GetMapping("/crypto-news")
    public ResponseEntity<?> getCryptoNews(@RequestParam(defaultValue = "6") int limit) {
        try {
            String apiUrl = "https://cryptopanic.com/api/developer/v2/posts/?auth_token="
                    + "263d57182fcdae784f08194e141971120e959e84" + "&public=true&kind=news&limit=" + limit;
            System.out.println("Making API call to: " + apiUrl);

            ResponseEntity<String> response = restTemplate.getForEntity(apiUrl, String.class);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                System.out.println("Response received: YES");
                System.out.println("Response preview: " + response.getBody().substring(0, Math.min(200, response.getBody().length())));

                JsonNode root = objectMapper.readTree(response.getBody());
                JsonNode results = root.get("results");

                if (results != null && results.isArray()) {
                    System.out.println("Results node exists: true");
                    System.out.println("Results array size: " + results.size());

                    List<Map<String, String>> articles = new ArrayList<>();

                    for (JsonNode node : results) {

                        if (!node.has("title")) continue;

                        Map<String, String> article = new HashMap<>();

                        // ✅ Safe ID
                        if (node.has("id")) {
                            article.put("id", node.get("id").asText());
                        }

                        // ✅ Title
                        article.put("title", node.get("title").asText());


                        // ✅ URL
                        article.put("url", node.has("url") ? node.get("url").asText() : "#");

                        // ✅ Published time
                        article.put("time", node.has("published_at")
                                ? node.get("published_at").asText()
                                : "Unknown");

                        // ✅ Source (nested: source.title)
                        if (node.has("source") && node.get("source").has("title")) {
                            article.put("source", node.get("source").get("title").asText());
                        } else {
                            article.put("source", "Unknown");
                        }

                        articles.add(article);

                        if (articles.size() == 6) break;
                    }

                    System.out.println("SUCCESS: Returning " + articles.size() + " real articles from CryptoPanic");
                    return ResponseEntity.ok(articles);
                } else {
                    System.out.println("No results array found in API response!");
                }
            } else {
                System.out.println("API call failed or response body null.");
            }
        } catch (Exception e) {
            System.out.println("Exception: " + e.getMessage());
        }

        // 🔴 Fallback dummy data (only if everything fails)
        List<Map<String, String>> fallback = Arrays.asList(
                Map.of("id", "fb-1", "title", "Bitcoin maintains consolidation above $60,000 as institutional interest grows",
                        "url", "https://cointelegraph.com", "time", "2 hours ago", "source", "Cointelegraph"),
                Map.of("id", "fb-2", "title", "Ethereum's Shanghai upgrade shows strong network adoption metrics",
                        "url", "https://coindesk.com", "time", "4 hours ago", "source", "CoinDesk"),
                Map.of("id", "fb-3", "title", "Major cryptocurrency exchange announces new DeFi integration features",
                        "url", "https://decrypt.co", "time", "6 hours ago", "source", "Decrypt")
        );

        System.out.println("FALLBACK: Returning " + fallback.size() + " dummy articles");
        return ResponseEntity.ok(fallback);
    }

    private ResponseEntity<?> getFallbackNews() {
        List<Map<String, Object>> fallbackNews = Arrays.asList(
            Map.of("id", "fb-1", "title", "Bitcoin maintains consolidation above $60,000 as institutional interest grows",
                   "url", "https://cointelegraph.com", "time", "2 hours ago", "source", "Cointelegraph"),
            Map.of("id", "fb-2", "title", "Ethereum's Shanghai upgrade shows strong network adoption metrics",
                   "url", "https://coindesk.com", "time", "4 hours ago", "source", "CoinDesk"),
            Map.of("id", "fb-3", "title", "Major cryptocurrency exchange announces new DeFi integration features",
                   "url", "https://decrypt.co", "time", "6 hours ago", "source", "Decrypt"),
            Map.of("id", "fb-4", "title", "Regulatory clarity emerges for crypto derivatives in European markets",
                   "url", "https://theblock.co", "time", "8 hours ago", "source", "TheBlock"),
            Map.of("id", "fb-5", "title", "Layer 2 scaling solutions see record transaction volumes this quarter",
                   "url", "https://blockworks.co", "time", "10 hours ago", "source", "Blockworks"),
            Map.of("id", "fb-6", "title", "Central bank digital currency pilots expand across multiple regions",
                   "url", "https://coinbase.com", "time", "12 hours ago", "source", "Coinbase")
        );
        return ResponseEntity.ok(fallbackNews);
    }

    private String formatTimestamp(String timestamp) {
        try {
            Instant instant = Instant.parse(timestamp);
            Instant now = Instant.now();

            long diffSeconds = now.getEpochSecond() - instant.getEpochSecond();

            if (diffSeconds < 60) {
                return "Just now";
            } else if (diffSeconds < 3600) {
                long minutes = diffSeconds / 60;
                return minutes + " minute" + (minutes > 1 ? "s" : "") + " ago";
            } else if (diffSeconds < 86400) {
                long hours = diffSeconds / 3600;
                return hours + " hour" + (hours > 1 ? "s" : "") + " ago";
            } else {
                long days = diffSeconds / 86400;
                return days + " day" + (days > 1 ? "s" : "") + " ago";
            }
        } catch (Exception e) {
            return "Recently";
        }
    }

    @GetMapping("/crypto-meme")
    public ResponseEntity<?> getCryptoMeme() {
        try {
            Map<String, Object> meme = fetchCryptoMemeFromReddit();
            return ResponseEntity.ok(meme);
        } catch (Exception e) {
            System.out.println("Crypto meme error: " + e.getMessage());
            // Return fallback meme
            return ResponseEntity.ok(getFallbackMeme());
        }
    }

    private Map<String, Object> fetchCryptoMemeFromReddit() {
        try {
            // Get Reddit access token if needed
            String accessToken = getRedditAccessToken();
            if (accessToken == null) {
                throw new Exception("Failed to get Reddit access token");
            }

            String[] subreddits = {"CryptoCurrencyMemes", "CryptoMemes"};
            List<Map<String, Object>> allValidMemes = new ArrayList<>();

            for (String subreddit : subreddits) {
                try {
                    List<Map<String, Object>> posts = fetchRedditPosts(subreddit, accessToken);

                    // Collect ALL valid memes instead of returning the first one
                    for (Map<String, Object> post : posts) {
                        if (isValidMemePost(post)) {
                            allValidMemes.add(post);
                        }
                    }
                } catch (Exception e) {
                    System.out.println("Error fetching from r/" + subreddit + ": " + e.getMessage());
                    continue; // Try next subreddit
                }
            }

            // If we found memes, return a random one
            if (!allValidMemes.isEmpty()) {
                int randomIndex = (int) (Math.random() * allValidMemes.size());
                return formatMemePost(allValidMemes.get(randomIndex));
            }

        } catch (Exception e) {
            System.out.println("Reddit API error: " + e.getMessage());
        }

        return getFallbackMeme();
    }

    private String getRedditAccessToken() {
        // Check if we have a valid cached token
        if (redditAccessToken != null && System.currentTimeMillis() < redditTokenExpiry) {
            return redditAccessToken;
        }

        try {
            // Prepare OAuth request
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);
            headers.set("User-Agent", redditUserAgent);

            // Reddit requires Basic Auth with client credentials
            String credentials = redditClientId + ":" + redditClientSecret;
            String encodedCredentials = java.util.Base64.getEncoder().encodeToString(credentials.getBytes());
            headers.set("Authorization", "Basic " + encodedCredentials);

            // OAuth request body
            String requestBody = "grant_type=client_credentials";
            HttpEntity<String> entity = new HttpEntity<>(requestBody, headers);

            // Make OAuth request
            ResponseEntity<String> response = restTemplate.exchange(
                "https://www.reddit.com/api/v1/access_token",
                HttpMethod.POST,
                entity,
                String.class
            );

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                JsonNode root = objectMapper.readTree(response.getBody());

                if (root.has("access_token")) {
                    redditAccessToken = root.get("access_token").asText();
                    int expiresIn = root.has("expires_in") ? root.get("expires_in").asInt() : 3600;
                    redditTokenExpiry = System.currentTimeMillis() + (expiresIn - 60) * 1000L; // Expire 1 minute early

                    System.out.println("Successfully obtained Reddit access token");
                    return redditAccessToken;
                }
            }

        } catch (Exception e) {
            System.out.println("Error getting Reddit access token: " + e.getMessage());
        }

        return null;
    }

    private List<Map<String, Object>> fetchRedditPosts(String subreddit, String accessToken) throws Exception {
        HttpHeaders headers = new HttpHeaders();
        headers.set("Authorization", "Bearer " + accessToken);
        headers.set("User-Agent", redditUserAgent);

        HttpEntity<String> entity = new HttpEntity<>(headers);

        // Randomize between different sorting methods and increase limit
        String[] sortMethods = {"hot", "new", "rising"};
        String sortMethod = sortMethods[(int) (Math.random() * sortMethods.length)];

        // Fetch more posts and add random parameter to avoid caching
        String url = "https://oauth.reddit.com/r/" + subreddit + "/" + sortMethod + ".json?limit=25&raw_json=1&t=" + System.currentTimeMillis();

        ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.GET, entity, String.class);

        if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
            JsonNode root = objectMapper.readTree(response.getBody());
            JsonNode data = root.get("data");

            if (data != null && data.has("children")) {
                JsonNode children = data.get("children");
                List<Map<String, Object>> posts = new ArrayList<>();

                for (JsonNode child : children) {
                    JsonNode postData = child.get("data");
                    if (postData != null) {
                        Map<String, Object> post = new HashMap<>();
                        post.put("title", postData.has("title") ? postData.get("title").asText() : "");
                        post.put("url", postData.has("url") ? postData.get("url").asText() : "");
                        post.put("permalink", postData.has("permalink") ? postData.get("permalink").asText() : "");
                        post.put("score", postData.has("score") ? postData.get("score").asInt() : 0);
                        post.put("subreddit", postData.has("subreddit") ? postData.get("subreddit").asText() : subreddit);
                        post.put("author", postData.has("author") ? postData.get("author").asText() : "unknown");
                        post.put("is_video", postData.has("is_video") ? postData.get("is_video").asBoolean() : false);
                        post.put("post_hint", postData.has("post_hint") ? postData.get("post_hint").asText() : "");

                        posts.add(post);
                    }
                }

                return posts;
            }
        }

        throw new Exception("Failed to fetch posts from r/" + subreddit);
    }

    private boolean isValidMemePost(Map<String, Object> post) {
        String url = (String) post.get("url");
        String postHint = (String) post.get("postHint");
        String title = (String) post.get("title");
        Integer score = (Integer) post.get("score");
        Boolean isVideo = (Boolean) post.get("is_video");

        // Basic filters for meme posts
        if (url == null || url.isEmpty()) return false;
        if (title == null) return false;
        if (score == null || score < 10) return false; // Minimum score threshold
        if (isVideo != null && isVideo) return false; // Skip videos

        // Check if it's an image
        boolean isImage = (postHint != null && postHint.equals("image")) ||
                         url.matches(".*\\.(jpg|jpeg|png|gif|webp).*") ||
                         url.contains("i.redd.it") ||
                         url.contains("i.imgur.com");

        if (!isImage) return false;

        // Check if title suggests it's meme-related (optional filter)
        String lowerTitle = title.toLowerCase();
        boolean seemsMemey = lowerTitle.contains("meme") ||
                           lowerTitle.contains("hodl") ||
                           lowerTitle.contains("moon") ||
                           lowerTitle.contains("diamond hands") ||
                           lowerTitle.contains("paper hands") ||
                           lowerTitle.contains("ape") ||
                           lowerTitle.contains("rocket") ||
                           lowerTitle.contains("stonks") ||
                           lowerTitle.contains("buy the dip") ||
                           title.length() < 100; // Shorter titles are often memes

        return seemsMemey || score > 100; // Either seems memey or has high score
    }

    private Map<String, Object> formatMemePost(Map<String, Object> post) {
        Map<String, Object> meme = new HashMap<>();
        meme.put("url", post.get("url"));
        meme.put("title", post.get("title"));
        meme.put("alt", "Crypto meme: " + post.get("title"));
        meme.put("source", "r/" + post.get("subreddit"));
        meme.put("author", "u/" + post.get("author"));
        meme.put("score", post.get("score"));
        meme.put("reddit_url", "https://reddit.com" + post.get("permalink"));

        return meme;
    }

    private Map<String, Object> getFallbackMeme() {
        List<Map<String, Object>> fallbackMemes = Arrays.asList(
            Map.of(
                "url", "https://i.imgflip.com/2/1bij.jpg",
                "title", "HODL Strong",
                "alt", "Crypto HODL meme",
                "source", "Static",
                "author", "System",
                "score", 100
            ),
            Map.of(
                "url", "https://i.imgflip.com/2/30b1gx.jpg",
                "title", "Bitcoin Price Goes Brrr",
                "alt", "Bitcoin price meme",
                "source", "Static",
                "author", "System",
                "score", 150
            ),
            Map.of(
                "url", "https://i.imgflip.com/2/1ur9b0.jpg",
                "title", "Crypto Trading Life",
                "alt", "Crypto trading meme",
                "source", "Static",
                "author", "System",
                "score", 200
            )
        );

        return fallbackMemes.get((int) (Math.random() * fallbackMemes.size()));
    }

    private String generateAIInsight(User user) {
        try {
            // Build personalized prompt based on user preferences
            String prompt = buildPersonalizedPrompt(user);

            // Prepare OpenRouter API request
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("Authorization", "Bearer " + openRouterApiKey);

            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("model", "deepseek/deepseek-chat"); // Using DeepSeek as it's very cost-effective

            List<Map<String, String>> messages = new ArrayList<>();
            messages.add(Map.of("role", "system", "content", "You are a helpful crypto investment advisor. Provide concise, actionable insights in 1-2 sentences. Be professional but approachable."));
            messages.add(Map.of("role", "user", "content", prompt));

            requestBody.put("messages", messages);
            requestBody.put("max_tokens", 100);
            requestBody.put("temperature", 0.7);

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

            // Make API call to OpenRouter
            ResponseEntity<String> response = restTemplate.exchange(
                "https://openrouter.ai/api/v1/chat/completions",
                HttpMethod.POST,
                entity,
                String.class
            );

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                JsonNode root = objectMapper.readTree(response.getBody());
                JsonNode choices = root.get("choices");

                if (choices != null && choices.isArray() && choices.size() > 0) {
                    JsonNode message = choices.get(0).get("message");
                    if (message != null && message.has("content")) {
                        String insight = message.get("content").asText().trim();
                        System.out.println("AI Insight generated successfully: " + insight);
                        return insight;
                    }
                }
            }

        } catch (Exception e) {
            System.out.println("OpenRouter API error: " + e.getMessage());
        }

        // Fallback to personalized static insights if API fails
        return getFallbackInsight(user);
    }

    private String buildPersonalizedPrompt(User user) {
        StringBuilder prompt = new StringBuilder();
        prompt.append("Generate a brief crypto investment insight for a ");

        // Add investor type
        if (user.getInvestorType() != null) {
            prompt.append(user.getInvestorType().toLowerCase());
        } else {
            prompt.append("crypto investor");
        }

        // Add crypto interests
        if (user.getCryptoInterests() != null && !user.getCryptoInterests().isEmpty()) {
            prompt.append(" interested in ");
            prompt.append(String.join(", ", user.getCryptoInterests()));
        }

        // Add content preferences context
        if (user.getContentPreferences() != null && !user.getContentPreferences().isEmpty()) {
            prompt.append(". They prefer ");
            prompt.append(String.join(", ", user.getContentPreferences()).toLowerCase());
            prompt.append(" content");
        }

        prompt.append(". Provide a relevant insight about current market conditions or opportunities.");

        return prompt.toString();
    }

    private String getFallbackInsight(User user) {
        // Enhanced fallback insights based on user type
        Map<String, List<String>> insights = new HashMap<>();

        insights.put("hodler", Arrays.asList(
            "Long-term holding strategies are showing positive trends with increased institutional adoption.",
            "DCA (Dollar Cost Averaging) remains the most effective strategy for HODLers during market volatility.",
            "Staking rewards are providing additional yield opportunities for long-term holders."
        ));

        insights.put("day trader", Arrays.asList(
            "High volatility periods present both opportunities and risks for day trading strategies.",
            "Technical analysis indicators suggest key support and resistance levels to watch.",
            "Volume patterns indicate potential breakout opportunities in the next 24-48 hours."
        ));

        insights.put("nft collector", Arrays.asList(
            "NFT marketplace activity is showing signs of consolidation with quality projects gaining traction.",
            "Utility-based NFTs are outperforming profile picture collections in recent weeks.",
            "New blockchain ecosystems are launching innovative NFT use cases."
        ));

        String userType = user.getInvestorType() != null ? user.getInvestorType().toLowerCase() : "hodler";
        List<String> relevantInsights = insights.getOrDefault(userType, insights.get("hodler"));

        return relevantInsights.get((int) (Math.random() * relevantInsights.size()));
    }

    // Inner classes for request DTOs
    public static class RegisterRequest {
        private String email;
        private String name;
        private String password;

        public String getEmail() { return email; }
        public void setEmail(String email) { this.email = email; }

        public String getName() { return name; }
        public void setName(String name) { this.name = name; }

        public String getPassword() { return password; }
        public void setPassword(String password) { this.password = password; }
    }

    public static class LoginRequest {
        private String email;
        private String password;

        public String getEmail() { return email; }
        public void setEmail(String email) { this.email = email; }

        public String getPassword() { return password; }
        public void setPassword(String password) { this.password = password; }
    }

    public static class OnboardingRequest {
        private List<String> cryptoInterests;
        private String investorType;
        private List<String> contentPreferences;

        public List<String> getCryptoInterests() { return cryptoInterests; }
        public void setCryptoInterests(List<String> cryptoInterests) { this.cryptoInterests = cryptoInterests; }

        public String getInvestorType() { return investorType; }
        public void setInvestorType(String investorType) { this.investorType = investorType; }

        public List<String> getContentPreferences() { return contentPreferences; }
        public void setContentPreferences(List<String> contentPreferences) { this.contentPreferences = contentPreferences; }
    }

    public static class FeedbackRequest {
        private Long userId;
        private String section;
        private String vote;
        private String timestamp;

        public Long getUserId() { return userId; }
        public void setUserId(Long userId) { this.userId = userId; }

        public String getSection() { return section; }
        public void setSection(String section) { this.section = section; }

        public String getVote() { return vote; }
        public void setVote(String vote) { this.vote = vote; }

        public String getTimestamp() { return timestamp; }
        public void setTimestamp(String timestamp) { this.timestamp = timestamp; }
    }

    public static class ArticleFeedbackRequest {
        private Long userId;
        private String articleId;
        private String vote; // "up" or "down"

        public Long getUserId() { return userId; }
        public void setUserId(Long userId) { this.userId = userId; }

        public String getArticleId() { return articleId; }
        public void setArticleId(String articleId) { this.articleId = articleId; }

        public String getVote() { return vote; }
        public void setVote(String vote) { this.vote = vote; }
    }
}