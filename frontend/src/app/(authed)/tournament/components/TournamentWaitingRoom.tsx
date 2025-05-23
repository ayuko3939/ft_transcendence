import { useState } from "react";

import { Button } from "./button";
import { Card } from "./card";

// ダミーデータ
const dummyParticipants = [
  { id: 1, name: "Player1", avatar: "👤" },
  { id: 2, name: "Player2", avatar: "👤" },
  { id: 3, name: "Player3", avatar: "👤" },
  { id: 4, name: "Player4", avatar: "👤" },
];

export const TournamentWaitingRoom = () => {
  const [participants, setParticipants] = useState(dummyParticipants);
  const [chatMessages, setChatMessages] = useState<string[]>([]);
  const [newMessage, setNewMessage] = useState("");

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      setChatMessages([...chatMessages, newMessage]);
      setNewMessage("");
    }
  };

  return (
    <div className="container mx-auto p-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {/* 参加者リスト */}
        <Card className="bg-gray-800 p-4 text-white">
          <h2 className="mb-4 text-xl font-semibold">Participants</h2>
          <div className="space-y-2">
            {participants.map((participant) => (
              <div
                key={participant.id}
                className="flex items-center space-x-2 rounded bg-gray-700 p-2"
              >
                <span>{participant.avatar}</span>
                <span>{participant.name}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* チャット */}
        <Card className="bg-gray-800 p-4 text-white md:col-span-2">
          <h2 className="mb-4 text-xl font-semibold">Chat</h2>
          <div className="mb-4 h-64 space-y-2 overflow-y-auto">
            {chatMessages.map((message, index) => (
              <div key={index} className="rounded bg-gray-700 p-2">
                {message}
              </div>
            ))}
          </div>
          <div className="flex space-x-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              className="flex-1 rounded bg-gray-700 p-2 text-white"
              placeholder="Type a message..."
            />
            <Button
              onClick={handleSendMessage}
              className="bg-blue-500 hover:bg-blue-600"
            >
              Send
            </Button>
          </div>
        </Card>
      </div>

      {/* 開始ボタン */}
      <div className="mt-4 flex justify-center">
        <Button
          onClick={() => {
            /* TODO: Start tournament */
          }}
          className="bg-green-500 px-8 py-2 hover:bg-green-600"
          disabled={participants.length < 2}
        >
          Start Tournament
        </Button>
      </div>
    </div>
  );
};
